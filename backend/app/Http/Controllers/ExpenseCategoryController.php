<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ExpenseCategory;
use App\Models\Expense;
use App\Services\AuditLogger;

class ExpenseCategoryController extends Controller
{
    public function index()
    {
        $categories = ExpenseCategory::orderBy('name', 'asc')->get();
        return response()->json(['success' => true, 'data' => $categories]);
    }

    public function store(Request $request)
    {
        $all = ExpenseCategory::select('id')->get();
        $nextNum = 1;
        foreach ($all as $c) {
            if (preg_match('/^ec(\d+)$/', $c->id, $matches)) {
                $num = (int)$matches[1];
                if ($num >= $nextNum) $nextNum = $num + 1;
            }
        }

        $data = $request->except(['id']);
        $data['id'] = "ec{$nextNum}";

        $newCat = ExpenseCategory::create($data);
        AuditLogger::log($request, 'Create Expense Category', "Created expense category: {$newCat->name}", 'Success', ['categoryId' => $newCat->id]);
        return response()->json(['success' => true, 'data' => $newCat], 201);
    }

    public function update(Request $request, $id)
    {
        $cat = ExpenseCategory::find($id);
        if (!$cat) {
            return response()->json(['success' => false, 'message' => 'Category not found'], 404);
        }

        $name = trim($request->input('name', ''));
        if (!$name) {
            return response()->json(['success' => false, 'message' => 'Category name is required'], 400);
        }

        $usedCount = Expense::where('expenseCategory', $cat->name)
            ->orWhere('expenseCategory', $cat->id)
            ->count();

        if ($usedCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Category \"{$cat->name}\" is actively used in {$usedCount} expense record(s) and cannot be updated."
            ], 400);
        }

        $duplicate = ExpenseCategory::where('name', $name)->where('id', '!=', $cat->id)->first();
        if ($duplicate) {
            return response()->json([
                'success' => false,
                'message' => "Category \"{$name}\" already exists in the master list."
            ], 400);
        }

        $cat->name = $name;
        $cat->save();

        AuditLogger::log($request, 'Update Expense Category', "Updated expense category: {$cat->name}", 'Success', ['categoryId' => $cat->id]);
        return response()->json(['success' => true, 'data' => $cat, 'message' => 'Expense category updated successfully']);
    }

    public function destroy($id)
    {
        $cat = ExpenseCategory::find($id);
        if (!$cat) {
            return response()->json(['success' => false, 'message' => 'Category not found'], 404);
        }

        $usedCount = Expense::where('expenseCategory', $cat->name)
            ->orWhere('expenseCategory', $cat->id)
            ->count();

        if ($usedCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Category \"{$cat->name}\" is used in {$usedCount} expense record(s) and cannot be deleted."
            ], 400);
        }

        $name = $cat->name;
        $cat->delete();
        AuditLogger::log(request(), 'Delete Expense Category', "Deleted expense category: {$name}", 'Success', ['categoryId' => $id]);
        return response()->json(['success' => true, 'message' => 'Category deleted']);
    }
}
