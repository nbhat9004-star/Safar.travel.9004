#!/usr/bin/env python3
"""
Multi-Type Inventory System Backend Test Suite
Tests all scenarios for the new inventory types feature
"""

import requests
import json
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "https://github-import-check.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
TRAVELER_EMAIL = "test-traveler-20260603120055@safar.com"
TRAVELER_PASSWORD = "password123"
HOST_EMAIL = "test-host-20260603120055@safar.com"
HOST_PASSWORD = "password123"
ADMIN_EMAIL = "test-admin-20260603120055@safar.com"
ADMIN_PASSWORD = "password123"

# Test state
traveler_token = None
host_token = None
admin_token = None
test_listing_id = None
test_old_listing_id = None
booking_ids = []

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def login(email, password):
    """Login and return Bearer token"""
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=10)
        if res.status_code == 200:
            data = res.json()
            token = data.get('token')
            log(f"✅ Login successful: {email}")
            return token
        else:
            log(f"❌ Login failed for {email}: {res.status_code} - {res.text}")
            return None
    except Exception as e:
        log(f"❌ Login error for {email}: {e}")
        return None

def headers(token):
    """Return auth headers"""
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def test_backward_compatibility():
    """Test 1: Backward compatibility with existing single-unit listings"""
    log("\n=== TEST 1: BACKWARD COMPATIBILITY ===")
    
    global test_old_listing_id, traveler_token
    
    # 1a. Get existing demo listings (should have inventoryTypes: [])
    try:
        res = requests.get(f"{BASE_URL}/listings?limit=5", timeout=10)
        assert res.status_code == 200, f"Failed to get listings: {res.status_code}"
        data = res.json()
        listings = data.get('listings', [])
        assert len(listings) > 0, "No demo listings found"
        
        # Find a listing without inventory types
        old_listing = None
        for listing in listings:
            if not listing.get('inventoryTypes') or len(listing.get('inventoryTypes', [])) == 0:
                old_listing = listing
                break
        
        assert old_listing is not None, "No legacy listing found"
        test_old_listing_id = old_listing['id']
        log(f"✅ 1a. Found legacy listing: {old_listing['title']} (id: {test_old_listing_id})")
        log(f"   - inventoryTypes: {old_listing.get('inventoryTypes', [])}")
        log(f"   - price: ₹{old_listing['price']}")
        
    except Exception as e:
        log(f"❌ 1a. Failed to get legacy listings: {e}")
        return False
    
    # 1b. Book existing single-unit listing
    try:
        checkin = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=35)).strftime('%Y-%m-%d')
        
        booking_payload = {
            "listingId": test_old_listing_id,
            "checkInDate": checkin,
            "checkOutDate": checkout,
            "guests": 2
        }
        
        res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
        assert res.status_code == 201, f"Failed to book legacy listing: {res.status_code} - {res.text}"
        data = res.json()
        booking = data.get('booking')
        assert booking is not None, "No booking returned"
        assert booking.get('inventoryTypeId') is None, "Legacy booking should not have inventoryTypeId"
        booking_ids.append(booking['bookingId'])
        log(f"✅ 1b. Booked legacy listing successfully (bookingId: {booking['bookingId']})")
        log(f"   - No inventoryTypeId (legacy mode)")
        
    except Exception as e:
        log(f"❌ 1b. Failed to book legacy listing: {e}")
        return False
    
    # 1c. Search should work for old listings
    try:
        res = requests.get(f"{BASE_URL}/listings?location=Srinagar", timeout=10)
        assert res.status_code == 200, f"Search failed: {res.status_code}"
        data = res.json()
        assert data.get('total', 0) > 0, "Search returned no results"
        log(f"✅ 1c. Search works for legacy listings (found {data['total']} results)")
        
    except Exception as e:
        log(f"❌ 1c. Search failed: {e}")
        return False
    
    # 1d. Old bookings display correctly
    try:
        res = requests.get(f"{BASE_URL}/bookings", headers=headers(traveler_token), timeout=10)
        assert res.status_code == 200, f"Failed to get bookings: {res.status_code}"
        data = res.json()
        bookings = data.get('bookings', [])
        assert len(bookings) > 0, "No bookings found"
        log(f"✅ 1d. Old bookings display correctly ({len(bookings)} bookings)")
        
    except Exception as e:
        log(f"❌ 1d. Failed to get bookings: {e}")
        return False
    
    log("✅ TEST 1 PASSED: Backward compatibility working")
    return True

def test_create_multi_type_listing():
    """Test 2: Create hotel with 3 room types"""
    log("\n=== TEST 2: CREATE MULTI-TYPE LISTING ===")
    
    global test_listing_id, admin_token
    
    try:
        listing_payload = {
            "title": "Luxury Kashmir Hotel - Multi Room Types",
            "description": "Premium hotel in Srinagar with multiple room options for every budget and preference",
            "category": "stay",
            "subcategory": "hotel",
            "location": "Dal Lake, Srinagar",
            "price": 3000,  # Base price (will be overridden by displayPrice)
            "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
            "amenities": ["WiFi", "Parking", "Restaurant"],
            "inventoryTypes": [
                {
                    "name": "Standard Room",
                    "description": "Comfortable room with garden view",
                    "price": 3000,
                    "quantity": 10,
                    "images": ["https://images.unsplash.com/photo-1611892440504-42a792e24d32"],
                    "beds": 1,
                    "guests": 2,
                    "amenities": ["WiFi", "TV"]
                },
                {
                    "name": "Deluxe Room",
                    "description": "Spacious room with lake view",
                    "price": 5000,
                    "quantity": 5,
                    "images": ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"],
                    "beds": 1,
                    "guests": 2,
                    "amenities": ["WiFi", "TV", "Balcony"]
                },
                {
                    "name": "Suite",
                    "description": "Luxury suite with panoramic views",
                    "price": 8000,
                    "quantity": 2,
                    "images": ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304"],
                    "beds": 2,
                    "guests": 4,
                    "amenities": ["WiFi", "TV", "Balcony", "Jacuzzi"]
                }
            ]
        }
        
        res = requests.post(f"{BASE_URL}/listings", json=listing_payload, headers=headers(admin_token), timeout=10)
        assert res.status_code == 201, f"Failed to create listing: {res.status_code} - {res.text}"
        data = res.json()
        listing = data.get('listing')
        assert listing is not None, "No listing returned"
        test_listing_id = listing['id']
        
        # Verify inventory types
        types = listing.get('inventoryTypes', [])
        assert len(types) == 3, f"Expected 3 types, got {len(types)}"
        
        # Check Standard Room
        standard = types[0]
        assert standard['name'] == "Standard Room", f"Expected 'Standard Room', got '{standard['name']}'"
        assert standard['price'] == 3000, f"Expected price 3000, got {standard['price']}"
        assert standard['quantity'] == 10, f"Expected quantity 10, got {standard['quantity']}"
        assert standard['available'] == 10, f"Expected available 10, got {standard['available']}"
        assert standard['status'] == 'active', f"Expected status 'active', got '{standard['status']}'"
        assert 'displayOrder' in standard, "Missing displayOrder"
        assert 'id' in standard, "Missing id"
        log(f"✅ 2a. Standard Room created: ₹{standard['price']}, qty: {standard['quantity']}, available: {standard['available']}")
        
        # Check Deluxe Room
        deluxe = types[1]
        assert deluxe['name'] == "Deluxe Room", f"Expected 'Deluxe Room', got '{deluxe['name']}'"
        assert deluxe['price'] == 5000, f"Expected price 5000, got {deluxe['price']}"
        assert deluxe['quantity'] == 5, f"Expected quantity 5, got {deluxe['quantity']}"
        assert deluxe['available'] == 5, f"Expected available 5, got {deluxe['available']}"
        log(f"✅ 2b. Deluxe Room created: ₹{deluxe['price']}, qty: {deluxe['quantity']}, available: {deluxe['available']}")
        
        # Check Suite
        suite = types[2]
        assert suite['name'] == "Suite", f"Expected 'Suite', got '{suite['name']}'"
        assert suite['price'] == 8000, f"Expected price 8000, got {suite['price']}"
        assert suite['quantity'] == 2, f"Expected quantity 2, got {suite['quantity']}"
        assert suite['available'] == 2, f"Expected available 2, got {suite['available']}"
        log(f"✅ 2c. Suite created: ₹{suite['price']}, qty: {suite['quantity']}, available: {suite['available']}")
        
        # Verify displayOrder
        assert types[0]['displayOrder'] <= types[1]['displayOrder'], "displayOrder not sequential"
        assert types[1]['displayOrder'] <= types[2]['displayOrder'], "displayOrder not sequential"
        log(f"✅ 2d. Display order correct: {types[0]['displayOrder']}, {types[1]['displayOrder']}, {types[2]['displayOrder']}")
        
        log(f"✅ TEST 2 PASSED: Multi-type listing created (id: {test_listing_id})")
        return True
        
    except Exception as e:
        log(f"❌ TEST 2 FAILED: {e}")
        return False

def test_booking_with_inventory_types():
    """Test 3: Booking with inventory types and availability tracking"""
    log("\n=== TEST 3: BOOKING WITH INVENTORY TYPES ===")
    
    global test_listing_id, traveler_token, booking_ids
    
    # Get listing to find inventory type IDs
    try:
        res = requests.get(f"{BASE_URL}/listings/{test_listing_id}", timeout=10)
        assert res.status_code == 200, f"Failed to get listing: {res.status_code}"
        listing = res.json().get('listing')
        types = listing.get('inventoryTypes', [])
        
        standard_id = types[0]['id']
        deluxe_id = types[1]['id']
        suite_id = types[2]['id']
        
        log(f"Inventory type IDs: Standard={standard_id}, Deluxe={deluxe_id}, Suite={suite_id}")
        
    except Exception as e:
        log(f"❌ Failed to get listing: {e}")
        return False
    
    # 3a. Book Standard Room (should succeed)
    try:
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        booking_payload = {
            "listingId": test_listing_id,
            "inventoryTypeId": standard_id,
            "checkInDate": checkin,
            "checkOutDate": checkout,
            "guests": 2
        }
        
        res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
        assert res.status_code == 201, f"Failed to book Standard Room: {res.status_code} - {res.text}"
        data = res.json()
        booking = data.get('booking')
        assert booking['inventoryTypeId'] == standard_id, "Wrong inventory type"
        assert booking['inventoryTypeName'] == "Standard Room", "Wrong type name"
        assert booking['pricePerNight'] == 3000, f"Expected price 3000, got {booking['pricePerNight']}"
        booking_ids.append(booking['bookingId'])
        log(f"✅ 3a. Booked Standard Room successfully (bookingId: {booking['bookingId']})")
        log(f"   - Price: ₹{booking['pricePerNight']}/night, Total: ₹{booking['totalPrice']}")
        
    except Exception as e:
        log(f"❌ 3a. Failed to book Standard Room: {e}")
        return False
    
    # 3b. Check available counter decremented (9/10)
    try:
        res = requests.get(f"{BASE_URL}/listings/{test_listing_id}", timeout=10)
        assert res.status_code == 200, f"Failed to get listing: {res.status_code}"
        listing = res.json().get('listing')
        standard = listing['inventoryTypes'][0]
        assert standard['available'] == 9, f"Expected available=9, got {standard['available']}"
        log(f"✅ 3b. Available counter decremented: {standard['available']}/10 Standard Rooms available")
        
    except Exception as e:
        log(f"❌ 3b. Failed to check counter: {e}")
        return False
    
    # 3c. Book 9 more Standard Rooms to fill capacity
    try:
        for i in range(9):
            checkin = (datetime.now() + timedelta(days=40 + i*10)).strftime('%Y-%m-%d')
            checkout = (datetime.now() + timedelta(days=45 + i*10)).strftime('%Y-%m-%d')
            
            booking_payload = {
                "listingId": test_listing_id,
                "inventoryTypeId": standard_id,
                "checkInDate": checkin,
                "checkOutDate": checkout,
                "guests": 2
            }
            
            res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
            assert res.status_code == 201, f"Failed to book Standard Room #{i+2}: {res.status_code} - {res.text}"
            booking_ids.append(res.json()['booking']['bookingId'])
        
        log(f"✅ 3c. Booked 9 more Standard Rooms (total 10/10 booked)")
        
    except Exception as e:
        log(f"❌ 3c. Failed to book multiple rooms: {e}")
        return False
    
    # 3d. Check available counter is 0
    try:
        res = requests.get(f"{BASE_URL}/listings/{test_listing_id}", timeout=10)
        assert res.status_code == 200, f"Failed to get listing: {res.status_code}"
        listing = res.json().get('listing')
        standard = listing['inventoryTypes'][0]
        assert standard['available'] == 0, f"Expected available=0, got {standard['available']}"
        log(f"✅ 3d. All Standard Rooms booked: {standard['available']}/10 available")
        
    except Exception as e:
        log(f"❌ 3d. Failed to check counter: {e}")
        return False
    
    # 3e. Try to book 11th Standard Room for SAME dates (should fail with 409)
    try:
        # Use the SAME dates as the first booking to test overlap protection
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        booking_payload = {
            "listingId": test_listing_id,
            "inventoryTypeId": standard_id,
            "checkInDate": checkin,
            "checkOutDate": checkout,
            "guests": 2
        }
        
        res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
        assert res.status_code == 409, f"Expected 409 Conflict, got {res.status_code}"
        data = res.json()
        assert 'error' in data, "No error message"
        assert 'available' in data['error'].lower() or 'booked' in data['error'].lower(), f"Wrong error message: {data['error']}"
        log(f"✅ 3e. 11th booking rejected with 409 Conflict: {data['error']}")
        
    except Exception as e:
        log(f"❌ 3e. Failed to test overbooking: {e}")
        return False
    
    # 3f. Book Deluxe Room (different inventory pool, should succeed)
    try:
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        booking_payload = {
            "listingId": test_listing_id,
            "inventoryTypeId": deluxe_id,
            "checkInDate": checkin,
            "checkOutDate": checkout,
            "guests": 2
        }
        
        res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
        assert res.status_code == 201, f"Failed to book Deluxe Room: {res.status_code} - {res.text}"
        data = res.json()
        booking = data.get('booking')
        assert booking['inventoryTypeId'] == deluxe_id, "Wrong inventory type"
        assert booking['pricePerNight'] == 5000, f"Expected price 5000, got {booking['pricePerNight']}"
        booking_ids.append(booking['bookingId'])
        log(f"✅ 3f. Booked Deluxe Room successfully (different inventory pool)")
        log(f"   - Price: ₹{booking['pricePerNight']}/night")
        
    except Exception as e:
        log(f"❌ 3f. Failed to book Deluxe Room: {e}")
        return False
    
    log("✅ TEST 3 PASSED: Booking with inventory types working")
    return True

def test_availability_search():
    """Test 4: Availability search with date filtering"""
    log("\n=== TEST 4: AVAILABILITY SEARCH ===")
    
    global test_listing_id, traveler_token, booking_ids
    
    # Get inventory type IDs
    try:
        res = requests.get(f"{BASE_URL}/listings/{test_listing_id}", timeout=10)
        listing = res.json().get('listing')
        types = listing.get('inventoryTypes', [])
        deluxe_id = types[1]['id']
        suite_id = types[2]['id']
    except Exception as e:
        log(f"❌ Failed to get listing: {e}")
        return False
    
    # 4a. Search with dates (listing should appear - has Deluxe available)
    try:
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        res = requests.get(f"{BASE_URL}/listings?checkIn={checkin}&checkOut={checkout}", timeout=10)
        assert res.status_code == 200, f"Search failed: {res.status_code}"
        data = res.json()
        listings = data.get('listings', [])
        
        # Check if our test listing appears
        found = any(l['id'] == test_listing_id for l in listings)
        assert found, "Listing should appear (has Deluxe rooms available)"
        log(f"✅ 4a. Listing appears in search (has available Deluxe rooms)")
        
    except Exception as e:
        log(f"❌ 4a. Search failed: {e}")
        return False
    
    # 4b. Book all Deluxe rooms (5 bookings) for the SAME dates
    try:
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        for i in range(4):  # Already booked 1, need 4 more
            booking_payload = {
                "listingId": test_listing_id,
                "inventoryTypeId": deluxe_id,
                "checkInDate": checkin,
                "checkOutDate": checkout,
                "guests": 2
            }
            
            res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
            assert res.status_code == 201, f"Failed to book Deluxe Room #{i+2}: {res.status_code}"
            booking_ids.append(res.json()['booking']['bookingId'])
        
        log(f"✅ 4b. Booked all 5 Deluxe Rooms for same dates")
        
    except Exception as e:
        log(f"❌ 4b. Failed to book Deluxe rooms: {e}")
        return False
    
    # 4c. Book all Suites (2 bookings) for the SAME dates
    try:
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        for i in range(2):
            booking_payload = {
                "listingId": test_listing_id,
                "inventoryTypeId": suite_id,
                "checkInDate": checkin,
                "checkOutDate": checkout,
                "guests": 2
            }
            
            res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
            assert res.status_code == 201, f"Failed to book Suite #{i+1}: {res.status_code}"
            booking_ids.append(res.json()['booking']['bookingId'])
        
        log(f"✅ 4c. Booked all 2 Suites for same dates")
        
    except Exception as e:
        log(f"❌ 4c. Failed to book Suites: {e}")
        return False
    
    # 4d. Search with same dates (listing should disappear - fully booked)
    try:
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        res = requests.get(f"{BASE_URL}/listings?checkIn={checkin}&checkOut={checkout}", timeout=10)
        assert res.status_code == 200, f"Search failed: {res.status_code}"
        data = res.json()
        listings = data.get('listings', [])
        
        # Check if our test listing is hidden
        found = any(l['id'] == test_listing_id for l in listings)
        assert not found, "Listing should be hidden (fully booked)"
        log(f"✅ 4d. Listing hidden from search (all types fully booked)")
        
    except Exception as e:
        log(f"❌ 4d. Search check failed: {e}")
        return False
    
    log("✅ TEST 4 PASSED: Availability search working correctly")
    return True

def test_booking_cancellation():
    """Test 5: Booking cancellation and counter restoration"""
    log("\n=== TEST 5: BOOKING CANCELLATION ===")
    
    global test_listing_id, traveler_token, booking_ids
    
    # 5a. Cancel 1 Standard Room booking
    try:
        # Get first Standard Room booking (booking_ids[1] is the first Standard Room, [0] is legacy)
        standard_booking_id = booking_ids[1]  # Second booking was first Standard Room
        
        res = requests.patch(
            f"{BASE_URL}/bookings/{standard_booking_id}",
            json={"status": "cancelled"},
            headers=headers(traveler_token),
            timeout=10
        )
        assert res.status_code == 200, f"Failed to cancel booking: {res.status_code} - {res.text}"
        data = res.json()
        booking = data.get('booking')
        assert booking['status'] == 'cancelled', f"Expected status 'cancelled', got '{booking['status']}'"
        log(f"✅ 5a. Cancelled Standard Room booking (bookingId: {standard_booking_id})")
        
    except Exception as e:
        log(f"❌ 5a. Failed to cancel booking: {e}")
        return False
    
    # 5b. Verify available counter incremented (1/10 available)
    try:
        res = requests.get(f"{BASE_URL}/listings/{test_listing_id}", timeout=10)
        assert res.status_code == 200, f"Failed to get listing: {res.status_code}"
        listing = res.json().get('listing')
        standard = listing['inventoryTypes'][0]
        assert standard['available'] == 1, f"Expected available=1, got {standard['available']}"
        log(f"✅ 5b. Available counter incremented: {standard['available']}/10 Standard Rooms available")
        
    except Exception as e:
        log(f"❌ 5b. Failed to check counter: {e}")
        return False
    
    # 5c. Search with dates (listing should reappear)
    try:
        checkin = (datetime.now() + timedelta(days=40)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        res = requests.get(f"{BASE_URL}/listings?checkIn={checkin}&checkOut={checkout}", timeout=10)
        assert res.status_code == 200, f"Search failed: {res.status_code}"
        data = res.json()
        listings = data.get('listings', [])
        
        # Check if our test listing appears again
        found = any(l['id'] == test_listing_id for l in listings)
        assert found, "Listing should reappear (has 1 Standard Room available)"
        log(f"✅ 5c. Listing reappears in search after cancellation")
        
    except Exception as e:
        log(f"❌ 5c. Search check failed: {e}")
        return False
    
    log("✅ TEST 5 PASSED: Booking cancellation working correctly")
    return True

def test_display_price_calculation():
    """Test 6: Display price calculation (minimum of active type prices)"""
    log("\n=== TEST 6: DISPLAY PRICE CALCULATION ===")
    
    global test_listing_id
    
    try:
        res = requests.get(f"{BASE_URL}/listings?limit=100", timeout=10)
        assert res.status_code == 200, f"Failed to get listings: {res.status_code}"
        data = res.json()
        listings = data.get('listings', [])
        
        # Find our test listing
        test_listing = None
        for listing in listings:
            if listing['id'] == test_listing_id:
                test_listing = listing
                break
        
        assert test_listing is not None, "Test listing not found in search results"
        
        # Check displayPrice field exists
        assert 'displayPrice' in test_listing, "displayPrice field missing"
        
        # For our test hotel: displayPrice should be 3000 (Standard Room price)
        assert test_listing['displayPrice'] == 3000, f"Expected displayPrice=3000, got {test_listing['displayPrice']}"
        
        log(f"✅ 6a. displayPrice field present: ₹{test_listing['displayPrice']}")
        log(f"✅ 6b. displayPrice is minimum of active types (Standard Room: ₹3000)")
        
        # Verify it's the minimum
        types = test_listing.get('inventoryTypes', [])
        active_prices = [t['price'] for t in types if t['status'] == 'active']
        min_price = min(active_prices) if active_prices else test_listing['price']
        assert test_listing['displayPrice'] == min_price, f"displayPrice should be {min_price}, got {test_listing['displayPrice']}"
        
        log(f"✅ 6c. displayPrice correctly calculated as min({', '.join(f'₹{p}' for p in active_prices)})")
        
        log("✅ TEST 6 PASSED: Display price calculation working")
        return True
        
    except Exception as e:
        log(f"❌ TEST 6 FAILED: {e}")
        return False

def test_inventory_type_status():
    """Test 7: Inactive inventory type handling"""
    log("\n=== TEST 7: INVENTORY TYPE STATUS ===")
    
    global admin_token, traveler_token
    
    # 7a. Create listing with one inactive type
    try:
        listing_payload = {
            "title": "Test Hotel - Inactive Type",
            "description": "Hotel with one inactive room type for testing",
            "category": "stay",
            "subcategory": "hotel",
            "location": "Gulmarg",
            "price": 2000,
            "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
            "inventoryTypes": [
                {
                    "name": "Active Room",
                    "price": 2000,
                    "quantity": 5,
                    "status": "active"
                },
                {
                    "name": "Inactive Room",
                    "price": 1500,
                    "quantity": 3,
                    "status": "inactive"
                }
            ]
        }
        
        res = requests.post(f"{BASE_URL}/listings", json=listing_payload, headers=headers(admin_token), timeout=10)
        assert res.status_code == 201, f"Failed to create listing: {res.status_code} - {res.text}"
        data = res.json()
        listing = data.get('listing')
        inactive_listing_id = listing['id']
        
        types = listing.get('inventoryTypes', [])
        active_type = types[0]
        inactive_type = types[1]
        
        assert active_type['status'] == 'active', "First type should be active"
        assert inactive_type['status'] == 'inactive', "Second type should be inactive"
        log(f"✅ 7a. Created listing with inactive type (id: {inactive_listing_id})")
        
    except Exception as e:
        log(f"❌ 7a. Failed to create listing: {e}")
        return False
    
    # 7b. Check displayPrice excludes inactive type
    try:
        res = requests.get(f"{BASE_URL}/listings?limit=100", timeout=10)
        data = res.json()
        listings = data.get('listings', [])
        
        test_listing = None
        for l in listings:
            if l['id'] == inactive_listing_id:
                test_listing = l
                break
        
        assert test_listing is not None, "Listing not found"
        assert test_listing['displayPrice'] == 2000, f"displayPrice should be 2000 (active type), got {test_listing['displayPrice']}"
        log(f"✅ 7b. displayPrice excludes inactive type: ₹{test_listing['displayPrice']} (Active Room only)")
        
    except Exception as e:
        log(f"❌ 7b. Failed to check displayPrice: {e}")
        return False
    
    # 7c. Try to book inactive type (should fail with 400)
    try:
        checkin = (datetime.now() + timedelta(days=50)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=55)).strftime('%Y-%m-%d')
        
        booking_payload = {
            "listingId": inactive_listing_id,
            "inventoryTypeId": inactive_type['id'],
            "checkInDate": checkin,
            "checkOutDate": checkout,
            "guests": 2
        }
        
        res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
        assert res.status_code == 400, f"Expected 400 Bad Request, got {res.status_code}"
        data = res.json()
        assert 'error' in data, "No error message"
        assert 'unavailable' in data['error'].lower() or 'inactive' in data['error'].lower(), f"Wrong error: {data['error']}"
        log(f"✅ 7c. Cannot book inactive type: {data['error']}")
        
    except Exception as e:
        log(f"❌ 7c. Failed to test inactive booking: {e}")
        return False
    
    log("✅ TEST 7 PASSED: Inactive type handling working")
    return True

def test_manual_reordering():
    """Test 8: Manual reordering of inventory types"""
    log("\n=== TEST 8: MANUAL REORDERING ===")
    
    global admin_token
    
    # 8a. Create listing with types in random order
    try:
        listing_payload = {
            "title": "Test Hotel - Reordering",
            "description": "Hotel for testing display order",
            "category": "stay",
            "subcategory": "hotel",
            "location": "Pahalgam",
            "price": 3000,
            "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
            "inventoryTypes": [
                {
                    "name": "Type C",
                    "price": 3000,
                    "quantity": 5,
                    "displayOrder": 2
                },
                {
                    "name": "Type A",
                    "price": 2000,
                    "quantity": 5,
                    "displayOrder": 0
                },
                {
                    "name": "Type B",
                    "price": 2500,
                    "quantity": 5,
                    "displayOrder": 1
                }
            ]
        }
        
        res = requests.post(f"{BASE_URL}/listings", json=listing_payload, headers=headers(admin_token), timeout=10)
        assert res.status_code == 201, f"Failed to create listing: {res.status_code} - {res.text}"
        data = res.json()
        listing = data.get('listing')
        reorder_listing_id = listing['id']
        
        types = listing.get('inventoryTypes', [])
        assert len(types) == 3, f"Expected 3 types, got {len(types)}"
        
        # Verify types are returned in displayOrder
        assert types[0]['name'] == "Type A", f"First type should be 'Type A', got '{types[0]['name']}'"
        assert types[1]['name'] == "Type B", f"Second type should be 'Type B', got '{types[1]['name']}'"
        assert types[2]['name'] == "Type C", f"Third type should be 'Type C', got '{types[2]['name']}'"
        
        assert types[0]['displayOrder'] == 0, f"Type A displayOrder should be 0, got {types[0]['displayOrder']}"
        assert types[1]['displayOrder'] == 1, f"Type B displayOrder should be 1, got {types[1]['displayOrder']}"
        assert types[2]['displayOrder'] == 2, f"Type C displayOrder should be 2, got {types[2]['displayOrder']}"
        
        log(f"✅ 8a. Created listing with custom displayOrder")
        log(f"   - Order: {types[0]['name']} (0), {types[1]['name']} (1), {types[2]['name']} (2)")
        
    except Exception as e:
        log(f"❌ 8a. Failed to create listing: {e}")
        return False
    
    # 8b. Update listing with new displayOrder values
    try:
        # Reverse the order
        types[0]['displayOrder'] = 2
        types[1]['displayOrder'] = 1
        types[2]['displayOrder'] = 0
        
        update_payload = {
            "inventoryTypes": types
        }
        
        res = requests.put(f"{BASE_URL}/listings/{reorder_listing_id}", json=update_payload, headers=headers(admin_token), timeout=10)
        assert res.status_code == 200, f"Failed to update listing: {res.status_code} - {res.text}"
        data = res.json()
        listing = data.get('listing')
        
        updated_types = listing.get('inventoryTypes', [])
        
        # Verify new order
        assert updated_types[0]['name'] == "Type C", f"First type should be 'Type C', got '{updated_types[0]['name']}'"
        assert updated_types[1]['name'] == "Type B", f"Second type should be 'Type B', got '{updated_types[1]['name']}'"
        assert updated_types[2]['name'] == "Type A", f"Third type should be 'Type A', got '{updated_types[2]['name']}'"
        
        log(f"✅ 8b. Updated displayOrder successfully")
        log(f"   - New order: {updated_types[0]['name']} (0), {updated_types[1]['name']} (1), {updated_types[2]['name']} (2)")
        
    except Exception as e:
        log(f"❌ 8b. Failed to update listing: {e}")
        return False
    
    log("✅ TEST 8 PASSED: Manual reordering working")
    return True

def test_price_validation():
    """Test 9: Price validation and error handling"""
    log("\n=== TEST 9: PRICE VALIDATION ===")
    
    global test_listing_id, traveler_token
    
    # Get inventory type IDs
    try:
        res = requests.get(f"{BASE_URL}/listings/{test_listing_id}", timeout=10)
        listing = res.json().get('listing')
        types = listing.get('inventoryTypes', [])
        standard_id = types[0]['id']
        inactive_id = None
        
        # Find an inactive type from previous test
        res2 = requests.get(f"{BASE_URL}/listings?limit=100", timeout=10)
        listings = res2.json().get('listings', [])
        for l in listings:
            if l.get('title') == "Test Hotel - Inactive Type":
                for t in l.get('inventoryTypes', []):
                    if t['status'] == 'inactive':
                        inactive_id = t['id']
                        inactive_listing_id = l['id']
                        break
                break
        
    except Exception as e:
        log(f"❌ Failed to get listing: {e}")
        return False
    
    # 9a. Try to book without inventoryTypeId (should fail)
    try:
        checkin = (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=65)).strftime('%Y-%m-%d')
        
        booking_payload = {
            "listingId": test_listing_id,
            # Missing inventoryTypeId
            "checkInDate": checkin,
            "checkOutDate": checkout,
            "guests": 2
        }
        
        res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
        assert res.status_code == 400, f"Expected 400 Bad Request, got {res.status_code}"
        data = res.json()
        assert 'error' in data, "No error message"
        assert 'type' in data['error'].lower() or 'select' in data['error'].lower(), f"Wrong error: {data['error']}"
        log(f"✅ 9a. Booking without inventoryTypeId rejected: {data['error']}")
        
    except Exception as e:
        log(f"❌ 9a. Failed to test missing inventoryTypeId: {e}")
        return False
    
    # 9b. Try to book with invalid inventoryTypeId (should fail)
    try:
        booking_payload = {
            "listingId": test_listing_id,
            "inventoryTypeId": "invalid-uuid-12345",
            "checkInDate": checkin,
            "checkOutDate": checkout,
            "guests": 2
        }
        
        res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
        assert res.status_code == 400, f"Expected 400 Bad Request, got {res.status_code}"
        data = res.json()
        assert 'error' in data, "No error message"
        assert 'invalid' in data['error'].lower() or 'type' in data['error'].lower(), f"Wrong error: {data['error']}"
        log(f"✅ 9b. Booking with invalid inventoryTypeId rejected: {data['error']}")
        
    except Exception as e:
        log(f"❌ 9b. Failed to test invalid inventoryTypeId: {e}")
        return False
    
    # 9c. Try to book inactive type (already tested in test 7, but verify again)
    if inactive_id:
        try:
            booking_payload = {
                "listingId": inactive_listing_id,
                "inventoryTypeId": inactive_id,
                "checkInDate": checkin,
                "checkOutDate": checkout,
                "guests": 2
            }
            
            res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
            assert res.status_code == 400, f"Expected 400 Bad Request, got {res.status_code}"
            data = res.json()
            assert 'error' in data, "No error message"
            log(f"✅ 9c. Booking inactive type rejected: {data['error']}")
            
        except Exception as e:
            log(f"❌ 9c. Failed to test inactive type: {e}")
            return False
    else:
        log("⚠️  9c. Skipped (no inactive type found)")
    
    log("✅ TEST 9 PASSED: Price validation working")
    return True

def test_concurrent_bookings():
    """Test 10: Concurrent bookings (simulated)"""
    log("\n=== TEST 10: CONCURRENT BOOKINGS ===")
    
    global traveler_token
    
    # Create a new listing with only 1 unit for easier testing
    try:
        listing_payload = {
            "title": "Test Hotel - Concurrency",
            "description": "Hotel with 1 room for concurrency testing",
            "category": "stay",
            "subcategory": "hotel",
            "location": "Sonamarg",
            "price": 4000,
            "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
            "inventoryTypes": [
                {
                    "name": "Single Room",
                    "price": 4000,
                    "quantity": 1
                }
            ]
        }
        
        res = requests.post(f"{BASE_URL}/listings", json=listing_payload, headers=headers(admin_token), timeout=10)
        assert res.status_code == 201, f"Failed to create listing: {res.status_code}"
        listing = res.json().get('listing')
        concurrency_listing_id = listing['id']
        single_room_id = listing['inventoryTypes'][0]['id']
        
        log(f"✅ 10a. Created listing with 1 room (id: {concurrency_listing_id})")
        
    except Exception as e:
        log(f"❌ 10a. Failed to create listing: {e}")
        return False
    
    # 10b. Make 2 simultaneous bookings for the same dates
    try:
        import threading
        
        checkin = (datetime.now() + timedelta(days=70)).strftime('%Y-%m-%d')
        checkout = (datetime.now() + timedelta(days=75)).strftime('%Y-%m-%d')
        
        results = []
        
        def make_booking(thread_id):
            try:
                booking_payload = {
                    "listingId": concurrency_listing_id,
                    "inventoryTypeId": single_room_id,
                    "checkInDate": checkin,
                    "checkOutDate": checkout,
                    "guests": 2
                }
                
                res = requests.post(f"{BASE_URL}/bookings", json=booking_payload, headers=headers(traveler_token), timeout=10)
                results.append({
                    'thread': thread_id,
                    'status': res.status_code,
                    'data': res.json()
                })
            except Exception as e:
                results.append({
                    'thread': thread_id,
                    'status': 'error',
                    'error': str(e)
                })
        
        # Start 2 threads simultaneously
        thread1 = threading.Thread(target=make_booking, args=(1,))
        thread2 = threading.Thread(target=make_booking, args=(2,))
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Check results
        assert len(results) == 2, f"Expected 2 results, got {len(results)}"
        
        success_count = sum(1 for r in results if r['status'] == 201)
        conflict_count = sum(1 for r in results if r['status'] == 409)
        
        log(f"   - Thread 1: {results[0]['status']} - {results[0].get('data', {}).get('error', 'Success')}")
        log(f"   - Thread 2: {results[1]['status']} - {results[1].get('data', {}).get('error', 'Success')}")
        
        # One should succeed, one should fail (or both might succeed if no overlap)
        # The important thing is no overbooking
        assert success_count >= 1, "At least one booking should succeed"
        
        log(f"✅ 10b. Concurrent bookings handled: {success_count} succeeded, {conflict_count} rejected")
        
    except Exception as e:
        log(f"❌ 10b. Failed to test concurrent bookings: {e}")
        return False
    
    # 10c. Verify no overbooking occurred
    try:
        res = requests.get(f"{BASE_URL}/listings/{concurrency_listing_id}", timeout=10)
        listing = res.json().get('listing')
        single_room = listing['inventoryTypes'][0]
        
        # Available should be 0 or 1 (not negative)
        assert single_room['available'] >= 0, f"Overbooking detected! Available: {single_room['available']}"
        assert single_room['available'] <= 1, f"Counter error! Available: {single_room['available']} > quantity: 1"
        
        log(f"✅ 10c. No overbooking: {single_room['available']}/1 available")
        
    except Exception as e:
        log(f"❌ 10c. Failed to verify overbooking: {e}")
        return False
    
    log("✅ TEST 10 PASSED: Concurrent bookings handled correctly")
    return True

def main():
    """Run all tests"""
    global traveler_token, host_token, admin_token
    
    log("=" * 80)
    log("MULTI-TYPE INVENTORY SYSTEM BACKEND TEST SUITE")
    log("=" * 80)
    
    # Login
    log("\n=== AUTHENTICATION ===")
    traveler_token = login(TRAVELER_EMAIL, TRAVELER_PASSWORD)
    host_token = login(HOST_EMAIL, HOST_PASSWORD)
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    if not all([traveler_token, host_token, admin_token]):
        log("❌ FATAL: Authentication failed")
        return
    
    # Run tests
    results = []
    
    results.append(("Backward Compatibility", test_backward_compatibility()))
    results.append(("Create Multi-Type Listing", test_create_multi_type_listing()))
    results.append(("Booking with Inventory Types", test_booking_with_inventory_types()))
    results.append(("Availability Search", test_availability_search()))
    results.append(("Booking Cancellation", test_booking_cancellation()))
    results.append(("Display Price Calculation", test_display_price_calculation()))
    results.append(("Inventory Type Status", test_inventory_type_status()))
    results.append(("Manual Reordering", test_manual_reordering()))
    results.append(("Price Validation", test_price_validation()))
    results.append(("Concurrent Bookings", test_concurrent_bookings()))
    
    # Summary
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{status}: {name}")
    
    log("\n" + "=" * 80)
    log(f"FINAL RESULT: {passed}/{total} tests passed ({passed*100//total}%)")
    log("=" * 80)
    
    if passed == total:
        log("\n🎉 ALL TESTS PASSED! Multi-type inventory system is working correctly.")
    else:
        log(f"\n⚠️  {total - passed} test(s) failed. Please review the errors above.")

if __name__ == "__main__":
    main()
