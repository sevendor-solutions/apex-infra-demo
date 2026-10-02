<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $origin = $request->header('Origin');
        $allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5000',
            'http://localhost:8000',
            'https://jkfutureinfra.com',
            'https://www.jkfutureinfra.com',
            'http://jkfutureinfra.com',
            'http://www.jkfutureinfra.com',
        ];

        if (env('ALLOWED_ORIGINS')) {
            $extra = array_map('trim', explode(',', env('ALLOWED_ORIGINS')));
            $allowedOrigins = array_unique(array_merge($allowedOrigins, $extra));
        }

        $allowOriginHeader = '*';
        if ($origin) {
            if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins) || str_ends_with($origin, 'jkfutureinfra.com')) {
                $allowOriginHeader = $origin;
            }
        }

        if ($request->isMethod('OPTIONS')) {
            return response('', 200)
                ->header('Access-Control-Allow-Origin', $allowOriginHeader)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Application, Accept')
                ->header('Access-Control-Allow-Credentials', 'true');
        }

        $response = $next($request);

        return $response
            ->header('Access-Control-Allow-Origin', $allowOriginHeader)
            ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
            ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Application, Accept')
            ->header('Access-Control-Allow-Credentials', 'true');
    }
}
