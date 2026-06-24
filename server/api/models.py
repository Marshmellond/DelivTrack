"""Pydantic schemas for request / response models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=64)
    password: str = Field(..., min_length=6)
    role: str = Field(default="viewer")  # admin / editor / viewer


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=64)
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    create_time: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Merchant ──────────────────────────────────────────────────────────────────

class MerchantCreate(BaseModel):
    name: str
    category: Optional[str] = None
    city: Optional[str] = None


class MerchantUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    city: Optional[str] = None


class MerchantResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    city: Optional[str] = None


# ── Rider ─────────────────────────────────────────────────────────────────────

class RiderCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    status: str = "offline"  # online / offline


class RiderUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = None


class RiderResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    city: Optional[str] = None
    status: str


# ── Menu item ─────────────────────────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    merchant_id: int
    name: str
    price: float
    category: Optional[str] = None


class MenuItemUpdate(BaseModel):
    merchant_id: Optional[int] = None
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None


class MenuItemResponse(BaseModel):
    id: int
    merchant_id: int
    name: str
    price: float
    category: Optional[str] = None


# ── Order ─────────────────────────────────────────────────────────────────────

class OrderResponse(BaseModel):
    id: int
    merchant_id: Optional[int] = None
    rider_id: Optional[int] = None
    user_id: Optional[int] = None
    status: Optional[str] = None
    amount: Optional[float] = None
    city: Optional[str] = None
    items: Optional[Any] = None  # JSON field
    create_time: Optional[datetime] = None
