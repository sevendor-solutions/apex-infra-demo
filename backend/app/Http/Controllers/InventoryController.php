<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use App\Services\AuditLogger;

class InventoryController extends Controller
{
    public function index()
    {
        $items = InventoryItem::orderBy('name', 'asc')->get();
        return response()->json(['success' => true, 'data' => $items]);
    }

    public function show($id)
    {
        $item = InventoryItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $item]);
    }

    public function store(Request $request)
    {
        $name = trim($request->input('name', ''));
        $code = trim($request->input('code', ''));

        if (!$name || !$code) {
            return response()->json(['success' => false, 'message' => 'Name and Unique Code are required'], 400);
        }

        if (InventoryItem::where('code', $code)->exists()) {
            return response()->json(['success' => false, 'message' => "Product code \"{$code}\" already exists"], 400);
        }

        if (InventoryItem::whereRaw('LOWER(name) = ?', [strtolower($name)])->exists()) {
            return response()->json(['success' => false, 'message' => "A product with name \"{$name}\" already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $openingStock = (float)($data['openingStock'] ?? 0);
        $data['openingStock'] = $openingStock;
        $data['currentStock'] = $openingStock;
        $data['purchasePrice'] = (float)($data['purchasePrice'] ?? 0);
        $data['sellingPrice'] = (float)($data['sellingPrice'] ?? 0);
        $data['gstPercentage'] = (float)($data['gstPercentage'] ?? 0);
        $data['minimumStockLevel'] = (float)($data['minimumStockLevel'] ?? 0);
        $data['userId'] = $authUser['id'] ?? null;

        $item = InventoryItem::create($data);

        if ($openingStock > 0) {
            StockMovement::create([
                'productCode' => $code,
                'type' => 'Stock In',
                'quantity' => $openingStock,
                'date' => date('Y-m-d'),
                'warehouse' => $data['warehouseLocation'] ?? 'Main Warehouse',
                'notes' => 'Opening Stock Initial Seeding',
                'userId' => $authUser['id'] ?? null,
            ]);
        }

        AuditLogger::log($request, 'Create Product', "Created product: {$name} ({$code})", 'Success', ['itemId' => $item->id]);

        return response()->json(['success' => true, 'data' => $item], 201);
    }

    public function update(Request $request, $id)
    {
        $item = InventoryItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }

        $name = trim($request->input('name', ''));
        if ($name && strtolower($name) !== strtolower($item->name)) {
            $exists = InventoryItem::where('id', '!=', $item->id)->whereRaw('LOWER(name) = ?', [strtolower($name)])->exists();
            if ($exists) {
                return response()->json(['success' => false, 'message' => "Another product with name \"{$name}\" already exists"], 400);
            }
        }

        $item->update($request->all());
        AuditLogger::log($request, 'Update Product', "Updated product: {$item->name} ({$item->code})", 'Success', ['itemId' => $item->id]);

        return response()->json(['success' => true, 'data' => $item]);
    }

    public function destroy(Request $request, $id)
    {
        $item = InventoryItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Product not found'], 404);
        }

        $name = $item->name;
        $code = $item->code;
        $item->delete();
        AuditLogger::log($request, 'Delete Product', "Deleted product: {$name} ({$code})", 'Success', ['itemId' => $id]);

        return response()->json(['success' => true, 'message' => 'Product deleted successfully']);
    }

    public function getMovements(Request $request)
    {
        $query = StockMovement::query();
        if ($request->query('productCode')) {
            $query->where('productCode', $request->query('productCode'));
        }
        $movements = $query->orderBy('date', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $movements]);
    }

    public function createMovement(Request $request)
    {
        $data = $request->all();
        $authUser = $request->attributes->get('auth_user');
        $data['userId'] = $authUser['id'] ?? null;
        $data['quantity'] = (float)($data['quantity'] ?? 0);

        $movement = StockMovement::create($data);

        // Update product stock
        $item = InventoryItem::where('code', $data['productCode'])->first();
        if ($item) {
            if ($data['type'] === 'Stock In') {
                $item->currentStock += $data['quantity'];
            } else {
                $item->currentStock -= $data['quantity'];
            }
            $item->save();
        }

        return response()->json(['success' => true, 'data' => $movement], 201);
    }

    public function stockIn(Request $request)
    {
        $productCode = $request->input('productCode');
        $quantity = (float)$request->input('quantity', 0);
        $date = $request->input('date', date('Y-m-d'));
        $warehouse = $request->input('warehouse');
        $notes = $request->input('notes');

        if (!$productCode || $quantity <= 0) {
            return response()->json(['success' => false, 'message' => 'Product code and positive quantity required'], 400);
        }

        $item = InventoryItem::where('code', $productCode)->first();
        if (!$item) return response()->json(['success' => false, 'message' => 'Product not found'], 404);

        $item->currentStock += $quantity;
        $item->save();

        $authUser = $request->attributes->get('auth_user');

        $movement = StockMovement::create([
            'productCode' => $productCode,
            'type' => 'Stock In',
            'quantity' => $quantity,
            'date' => $date,
            'warehouse' => $warehouse ?: ($item->warehouseLocation ?: 'Main Warehouse'),
            'notes' => $notes,
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Stock In', "Added stock of {$quantity} for {$item->name}", 'Success', ['movementId' => $movement->id]);
        return response()->json(['success' => true, 'data' => $movement, 'item' => $item], 201);
    }

    public function stockOut(Request $request)
    {
        $productCode = $request->input('productCode');
        $quantity = (float)$request->input('quantity', 0);
        $date = $request->input('date', date('Y-m-d'));
        $warehouse = $request->input('warehouse');
        $notes = $request->input('notes');

        if (!$productCode || $quantity <= 0) {
            return response()->json(['success' => false, 'message' => 'Product code and positive quantity required'], 400);
        }

        $item = InventoryItem::where('code', $productCode)->first();
        if (!$item) return response()->json(['success' => false, 'message' => 'Product not found'], 404);

        $item->currentStock -= $quantity;
        $item->save();

        $authUser = $request->attributes->get('auth_user');

        $movement = StockMovement::create([
            'productCode' => $productCode,
            'type' => 'Stock Out',
            'quantity' => $quantity,
            'date' => $date,
            'warehouse' => $warehouse ?: ($item->warehouseLocation ?: 'Main Warehouse'),
            'notes' => $notes,
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Stock Out', "Removed stock of {$quantity} for {$item->name}", 'Success', ['movementId' => $movement->id]);
        return response()->json(['success' => true, 'data' => $movement, 'item' => $item], 201);
    }

    public function adjust(Request $request)
    {
        $productCode = $request->input('productCode');
        $quantity = (float)$request->input('quantity', 0);
        $date = $request->input('date', date('Y-m-d'));
        $notes = $request->input('notes');

        if (!$productCode) {
            return response()->json(['success' => false, 'message' => 'Product code is required'], 400);
        }

        $item = InventoryItem::where('code', $productCode)->first();
        if (!$item) return response()->json(['success' => false, 'message' => 'Product not found'], 404);

        $item->currentStock = $quantity;
        $item->save();

        $authUser = $request->attributes->get('auth_user');

        $movement = StockMovement::create([
            'productCode' => $productCode,
            'type' => 'Adjustment',
            'quantity' => $quantity,
            'date' => $date,
            'warehouse' => $item->warehouseLocation ?: 'Main Warehouse',
            'notes' => $notes ?: 'Manual stock override adjustment',
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Stock Adjustment', "Adjusted stock of {$item->name} to {$quantity}", 'Success', ['movementId' => $movement->id]);
        return response()->json(['success' => true, 'data' => $movement, 'item' => $item], 201);
    }
}
