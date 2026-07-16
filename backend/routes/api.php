<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\ProjectUserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// User API routes
Route::post('/users', [UserController::class, 'store']);

// Project User API routes
Route::get('/get-started', [ProjectUserController::class, 'store']);
