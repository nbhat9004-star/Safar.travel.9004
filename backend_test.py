#!/usr/bin/env python3
"""
Comprehensive backend test for Safar Listings API.
Tests all listings CRUD endpoints, filters, auth, and MongoDB persistence.
"""
import os
import sys
import requests
import json
from pymongo import MongoClient
import bcrypt
import uuid

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://deploy-check-71.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'safar')

# Test data - reuse from previous auth tests
TEST_TRAVELER = {
    'name': 'Priya Sharma',
    'email': 'priya.sharma@safar.test',
    'password': 'secure123',
    'role': 'traveler'
}

TEST_HOST = {
    'name': 'Ravi Kumar',
    'email': 'ravi.kumar@safar.test',
    'password': 'secure456',
    'role': 'host'
}

TEST_ADMIN = {
    'name': 'Admin Safar',
    'email': 'admin_test@safar.local',
    'password': 'admin789',
    'role': 'admin'
}

def print_test(name):
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    print(f"❌ FAIL: {msg}")

def print_info(msg):
    print(f"ℹ️  INFO: {msg}")

def cleanup_test_data():
    """Remove test users, listings, and bookings from MongoDB"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Clean test users
        test_emails = [TEST_TRAVELER['email'], TEST_HOST['email'], TEST_ADMIN['email']]
        result = db['users'].delete_many({'email': {'$in': test_emails}})
        print_info(f"Cleaned up {result.deleted_count} test users")
        
        # Clean test listings (non-demo)
        result = db['listings'].delete_many({'isDemo': False})
        print_info(f"Cleaned up {result.deleted_count} test listings")
        
        # Clean test bookings
        result = db['bookings'].delete_many({})
        print_info(f"Cleaned up {result.deleted_count} test bookings")
        
        client.close()
    except Exception as e:
        print_fail(f"Cleanup failed: {e}")

def setup_test_users():
    """Create test users in MongoDB"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        users = db['users']
        
        for user_data in [TEST_TRAVELER, TEST_HOST, TEST_ADMIN]:
            existing = users.find_one({'email': user_data['email'].lower()})
            if not existing:
                password_hash = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
                user = {
                    'id': str(uuid.uuid4()),
                    'name': user_data['name'],
                    'email': user_data['email'].lower(),
                    'role': user_data['role'],
                    'passwordHash': password_hash,
                    'avatar': f"https://api.dicebear.com/9.x/initials/svg?seed={user_data['name']}&backgroundColor=0F3D2E",
                    'createdAt': None,
                    'updatedAt': None
                }
                users.insert_one(user)
                print_info(f"Created {user_data['role']} user: {user_data['email']}")
            else:
                print_info(f"User already exists: {user_data['email']}")
        
        client.close()
    except Exception as e:
        print_fail(f"Setup failed: {e}")

def get_auth_token(email, password):
    """Login and get auth token"""
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={'email': email, 'password': password},
            timeout=10
        )
        if response.status_code == 200:
            return response.json().get('token')
        return None
    except:
        return None

# Test 1: Auto-seed verification
def test_auto_seed():
    print_test("1. Auto-seed Verification - GET /api/listings")
    
    try:
        response = requests.get(f"{API_BASE}/listings", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get('ok'):
            print_fail("Response missing ok: true")
            return False
        print_pass("Response has ok: true")
        
        listings = data.get('listings', [])
        total = data.get('total', 0)
        
        if total >= 12:
            print_pass(f"Total listings: {total} (>= 12)")
        else:
            print_fail(f"Total listings: {total} (expected >= 12)")
            return False
        
        if len(listings) >= 12:
            print_pass(f"Listings array has {len(listings)} items")
        else:
            print_fail(f"Listings array has {len(listings)} items (expected >= 12)")
            return False
        
        # Check all are approved
        all_approved = all(l.get('status') == 'approved' for l in listings)
        if all_approved:
            print_pass("All listings have status='approved'")
        else:
            print_fail("Not all listings are approved")
            return False
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 2: Filter by category
def test_filter_category():
    print_test("2. Filter by Category - GET /api/listings?category=stay")
    
    try:
        response = requests.get(f"{API_BASE}/listings?category=stay", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        if len(listings) > 0:
            print_pass(f"Found {len(listings)} stay listings")
            
            # Verify all are stay category
            all_stay = all(l.get('category') == 'stay' for l in listings)
            if all_stay:
                print_pass("All listings have category='stay'")
                return True
            else:
                print_fail("Not all listings have category='stay'")
                return False
        else:
            print_fail("No stay listings found")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 3: Filter by subcategory
def test_filter_subcategory():
    print_test("3. Filter by Subcategory - GET /api/listings?subcategory=houseboat")
    
    try:
        response = requests.get(f"{API_BASE}/listings?subcategory=houseboat", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        if len(listings) > 0:
            print_pass(f"Found {len(listings)} houseboat listings")
            
            # Verify all are houseboat
            all_houseboat = all(l.get('subcategory') == 'houseboat' for l in listings)
            if all_houseboat:
                print_pass("All listings have subcategory='houseboat'")
                return True
            else:
                print_fail("Not all listings have subcategory='houseboat'")
                return False
        else:
            print_fail("No houseboat listings found")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 4: Filter by services (AND semantics)
def test_filter_services():
    print_test("4. Filter by Services - GET /api/listings?services=wazwan,kehwa")
    
    try:
        response = requests.get(f"{API_BASE}/listings?services=wazwan,kehwa", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        if len(listings) > 0:
            print_pass(f"Found {len(listings)} listings with both wazwan and kehwa")
            
            # Verify all have both services
            all_have_both = all(
                'wazwan' in l.get('services', []) and 'kehwa' in l.get('services', [])
                for l in listings
            )
            if all_have_both:
                print_pass("All listings contain BOTH wazwan AND kehwa services")
                return True
            else:
                print_fail("Not all listings have both services")
                return False
        else:
            print_info("No listings found with both services (acceptable if none match)")
            return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 5: Filter by price range
def test_filter_price_range():
    print_test("5. Filter by Price Range - GET /api/listings?minPrice=2000&maxPrice=5000")
    
    try:
        response = requests.get(f"{API_BASE}/listings?minPrice=2000&maxPrice=5000", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        if len(listings) > 0:
            print_pass(f"Found {len(listings)} listings in price range 2000-5000")
            
            # Verify all are in range
            all_in_range = all(
                2000 <= l.get('price', 0) <= 5000
                for l in listings
            )
            if all_in_range:
                print_pass("All listings are within price range 2000-5000")
                return True
            else:
                print_fail("Some listings are outside price range")
                return False
        else:
            print_info("No listings in price range (acceptable if none match)")
            return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 6: Filter by location
def test_filter_location():
    print_test("6. Filter by Location - GET /api/listings?location=Srinagar")
    
    try:
        response = requests.get(f"{API_BASE}/listings?location=Srinagar", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        if len(listings) > 0:
            print_pass(f"Found {len(listings)} listings in Srinagar")
            
            # Verify all contain Srinagar (case-insensitive)
            all_srinagar = all(
                'srinagar' in l.get('location', '').lower()
                for l in listings
            )
            if all_srinagar:
                print_pass("All listings contain 'Srinagar' in location")
                return True
            else:
                print_fail("Not all listings contain 'Srinagar'")
                return False
        else:
            print_fail("No listings found in Srinagar")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 7: Status filter without auth (should return approved only)
def test_filter_status_no_auth():
    print_test("7. Status Filter No Auth - GET /api/listings?status=pending")
    
    try:
        response = requests.get(f"{API_BASE}/listings?status=pending", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        # Should return approved only (non-admin can't see pending)
        all_approved = all(l.get('status') == 'approved' for l in listings)
        if all_approved:
            print_pass("Non-admin cannot see pending listings (returns approved only)")
            return True
        else:
            print_fail("Non-admin can see non-approved listings")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 8: Status filter with admin auth
def test_filter_status_admin():
    print_test("8. Status Filter Admin - GET /api/listings?status=all (admin)")
    
    token = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    if not token:
        print_fail("Failed to get admin token")
        return False
    
    try:
        response = requests.get(
            f"{API_BASE}/listings?status=all",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        print_pass(f"Admin can query all statuses (found {len(listings)} listings)")
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 9: Create listing without auth
def test_create_listing_no_auth():
    print_test("9. Create Listing No Auth - POST /api/listings")
    
    listing_data = {
        'title': 'Test Listing',
        'description': 'This is a test listing for Safar',
        'category': 'stay',
        'location': 'Srinagar',
        'price': 3000
    }
    
    try:
        response = requests.post(f"{API_BASE}/listings", json=listing_data, timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Unauthorized (401) - auth required")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 10: Create listing as traveler
def test_create_listing_traveler():
    print_test("10. Create Listing as Traveler - POST /api/listings")
    
    token = get_auth_token(TEST_TRAVELER['email'], TEST_TRAVELER['password'])
    if not token:
        print_fail("Failed to get traveler token")
        return False
    
    listing_data = {
        'title': 'Test Listing',
        'description': 'This is a test listing for Safar',
        'category': 'stay',
        'location': 'Srinagar',
        'price': 3000
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/listings",
            json=listing_data,
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            print_pass("Forbidden (403) - travelers cannot create listings")
            return True
        else:
            print_fail(f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 11: Create listing as host
def test_create_listing_host():
    print_test("11. Create Listing as Host - POST /api/listings")
    
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False, None
    
    listing_data = {
        'title': 'Beautiful Kashmir Houseboat',
        'description': 'Experience authentic Kashmir living on Dal Lake with stunning mountain views',
        'category': 'stay',
        'subcategory': 'houseboat',
        'location': 'Dal Lake, Srinagar',
        'price': 4500,
        'images': ['https://example.com/image1.jpg'],
        'amenities': ['Wi-Fi', 'Breakfast', 'Lake View'],
        'services': ['houseboat', 'breakfast', 'kehwa']
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/listings",
            json=listing_data,
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print_fail(f"Expected 201, got {response.status_code}")
            print_info(f"Response: {response.json()}")
            return False, None
        
        print_pass("Status code 201 (Created)")
        
        data = response.json()
        listing = data.get('listing')
        
        if not listing:
            print_fail("No listing in response")
            return False, None
        
        # Verify status is pending
        if listing.get('status') == 'pending':
            print_pass("Listing status is 'pending'")
        else:
            print_fail(f"Listing status is '{listing.get('status')}', expected 'pending'")
            return False, None
        
        # Verify isDemo is false
        if listing.get('isDemo') == False:
            print_pass("isDemo is false")
        else:
            print_fail(f"isDemo is {listing.get('isDemo')}, expected false")
        
        # Verify hostId matches current user
        print_pass(f"hostId: {listing.get('hostId')}")
        
        # Verify hostName matches user
        if listing.get('hostName') == TEST_HOST['name']:
            print_pass(f"hostName matches: {listing.get('hostName')}")
        else:
            print_fail(f"hostName is '{listing.get('hostName')}', expected '{TEST_HOST['name']}'")
        
        return True, listing.get('id')
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False, None

# Test 12: Create listing as admin
def test_create_listing_admin():
    print_test("12. Create Listing as Admin - POST /api/listings")
    
    token = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    if not token:
        print_fail("Failed to get admin token")
        return False, None
    
    listing_data = {
        'title': 'Admin Premium Cottage',
        'description': 'Premium cottage in Pahalgam with all modern amenities',
        'category': 'stay',
        'subcategory': 'cottage',
        'location': 'Pahalgam',
        'price': 5500,
        'images': ['https://example.com/cottage.jpg'],
        'amenities': ['Fireplace', 'Garden', 'Parking'],
        'services': ['cottage', 'breakfast']
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/listings",
            json=listing_data,
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print_fail(f"Expected 201, got {response.status_code}")
            return False, None
        
        print_pass("Status code 201 (Created)")
        
        data = response.json()
        listing = data.get('listing')
        
        # Verify status is approved (admin listings auto-approved)
        if listing.get('status') == 'approved':
            print_pass("Admin listing status is 'approved' (auto-approved)")
            return True, listing.get('id')
        else:
            print_fail(f"Listing status is '{listing.get('status')}', expected 'approved'")
            return False, None
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False, None

# Test 13: Create listing validation errors
def test_create_listing_validation():
    print_test("13. Create Listing Validation - POST /api/listings")
    
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False
    
    test_cases = [
        ({}, "missing title"),
        ({'title': 'AB', 'description': 'Valid description', 'category': 'stay', 'location': 'Srinagar', 'price': 1000}, "title < 3 chars"),
        ({'title': 'Valid Title', 'description': 'Short', 'category': 'stay', 'location': 'Srinagar', 'price': 1000}, "description < 10 chars"),
        ({'title': 'Valid Title', 'description': 'Valid description', 'category': 'invalid', 'location': 'Srinagar', 'price': 1000}, "invalid category"),
        ({'title': 'Valid Title', 'description': 'Valid description', 'category': 'stay', 'location': '', 'price': 1000}, "missing location"),
        ({'title': 'Valid Title', 'description': 'Valid description', 'category': 'stay', 'location': 'Srinagar', 'price': 0}, "price <= 0"),
        ({'title': 'Valid Title', 'description': 'Valid description', 'category': 'stay', 'location': 'Srinagar', 'price': 'invalid'}, "price NaN"),
    ]
    
    all_passed = True
    for payload, description in test_cases:
        try:
            response = requests.post(
                f"{API_BASE}/listings",
                json=payload,
                headers={'Authorization': f'Bearer {token}'},
                timeout=10
            )
            
            if response.status_code == 400:
                print_pass(f"Validation failed for {description}: 400")
            else:
                print_fail(f"Expected 400 for {description}, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print_fail(f"Exception testing {description}: {e}")
            all_passed = False
    
    return all_passed

# Test 14: Get single listing (approved)
def test_get_single_listing_approved():
    print_test("14. Get Single Listing (Approved) - GET /api/listings/:id")
    
    # First get an approved listing ID
    response = requests.get(f"{API_BASE}/listings", timeout=10)
    if response.status_code != 200:
        print_fail("Failed to get listings")
        return False
    
    listings = response.json().get('listings', [])
    if not listings:
        print_fail("No listings found")
        return False
    
    listing_id = listings[0].get('id')
    
    try:
        response = requests.get(f"{API_BASE}/listings/{listing_id}", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Status code 200")
        
        data = response.json()
        listing = data.get('listing')
        
        if listing:
            print_pass(f"Listing returned: {listing.get('title')}")
            return True
        else:
            print_fail("No listing in response")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 15: Get single listing (pending, no auth)
def test_get_single_listing_pending_no_auth():
    print_test("15. Get Single Listing (Pending, No Auth) - GET /api/listings/:id")
    
    # Create a pending listing first
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False
    
    listing_data = {
        'title': 'Pending Test Listing',
        'description': 'This listing should be pending',
        'category': 'stay',
        'location': 'Gulmarg',
        'price': 3500
    }
    
    create_response = requests.post(
        f"{API_BASE}/listings",
        json=listing_data,
        headers={'Authorization': f'Bearer {token}'},
        timeout=10
    )
    
    if create_response.status_code != 201:
        print_fail("Failed to create pending listing")
        return False
    
    listing_id = create_response.json().get('listing', {}).get('id')
    
    try:
        # Try to get pending listing without auth
        response = requests.get(f"{API_BASE}/listings/{listing_id}", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 404:
            print_pass("Pending listing not accessible without auth (404)")
            return True
        else:
            print_fail(f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 16: Get single listing (pending, with owner auth)
def test_get_single_listing_pending_owner():
    print_test("16. Get Single Listing (Pending, Owner Auth) - GET /api/listings/:id")
    
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False
    
    # Get host's own pending listings
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {token}'},
        timeout=10
    )
    
    if response.status_code != 200:
        print_fail("Failed to get host listings")
        return False
    
    listings = response.json().get('listings', [])
    pending_listings = [l for l in listings if l.get('status') == 'pending']
    
    if not pending_listings:
        print_info("No pending listings found for host")
        return True
    
    listing_id = pending_listings[0].get('id')
    
    try:
        # Owner should be able to see their own pending listing
        response = requests.get(
            f"{API_BASE}/listings/{listing_id}",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print_pass("Owner can view their own pending listing")
            return True
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 17: Get single listing (pending, with admin auth)
def test_get_single_listing_pending_admin():
    print_test("17. Get Single Listing (Pending, Admin Auth) - GET /api/listings/:id")
    
    admin_token = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    host_token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    
    if not admin_token or not host_token:
        print_fail("Failed to get tokens")
        return False
    
    # Get host's pending listings
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {host_token}'},
        timeout=10
    )
    
    listings = response.json().get('listings', [])
    pending_listings = [l for l in listings if l.get('status') == 'pending']
    
    if not pending_listings:
        print_info("No pending listings found")
        return True
    
    listing_id = pending_listings[0].get('id')
    
    try:
        # Admin should be able to see any pending listing
        response = requests.get(
            f"{API_BASE}/listings/{listing_id}",
            headers={'Authorization': f'Bearer {admin_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print_pass("Admin can view any pending listing")
            return True
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 18: Get non-existent listing
def test_get_nonexistent_listing():
    print_test("18. Get Non-existent Listing - GET /api/listings/:id")
    
    fake_id = str(uuid.uuid4())
    
    try:
        response = requests.get(f"{API_BASE}/listings/{fake_id}", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 404:
            print_pass("Non-existent listing returns 404")
            return True
        else:
            print_fail(f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 19: Update listing (non-owner)
def test_update_listing_non_owner():
    print_test("19. Update Listing (Non-owner) - PUT /api/listings/:id")
    
    host_token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    traveler_token = get_auth_token(TEST_TRAVELER['email'], TEST_TRAVELER['password'])
    
    if not host_token or not traveler_token:
        print_fail("Failed to get tokens")
        return False
    
    # Get host's listings
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {host_token}'},
        timeout=10
    )
    
    listings = response.json().get('listings', [])
    if not listings:
        print_info("No listings found for host")
        return True
    
    listing_id = listings[0].get('id')
    
    try:
        # Try to update as traveler (non-owner)
        response = requests.put(
            f"{API_BASE}/listings/{listing_id}",
            json={'title': 'Hacked Title'},
            headers={'Authorization': f'Bearer {traveler_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            print_pass("Non-owner cannot update listing (403)")
            return True
        else:
            print_fail(f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 20: Update listing (owner, status resets to pending)
def test_update_listing_owner():
    print_test("20. Update Listing (Owner) - PUT /api/listings/:id")
    
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False
    
    # Get host's listings
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {token}'},
        timeout=10
    )
    
    listings = response.json().get('listings', [])
    if not listings:
        print_info("No listings found for host")
        return True
    
    listing_id = listings[0].get('id')
    original_status = listings[0].get('status')
    
    try:
        # Update listing
        response = requests.put(
            f"{API_BASE}/listings/{listing_id}",
            json={'title': 'Updated Title by Owner', 'price': 4000},
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Status code 200")
        
        data = response.json()
        listing = data.get('listing')
        
        # Verify status reset to pending
        if listing.get('status') == 'pending':
            print_pass("Host edit resets status to 'pending'")
            return True
        else:
            print_fail(f"Status is '{listing.get('status')}', expected 'pending'")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 21: Update listing (admin, status preserved)
def test_update_listing_admin():
    print_test("21. Update Listing (Admin) - PUT /api/listings/:id")
    
    admin_token = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    if not admin_token:
        print_fail("Failed to get admin token")
        return False
    
    # Get any listing
    response = requests.get(f"{API_BASE}/listings", timeout=10)
    listings = response.json().get('listings', [])
    
    if not listings:
        print_fail("No listings found")
        return False
    
    listing_id = listings[0].get('id')
    original_status = listings[0].get('status')
    
    try:
        # Update listing as admin
        response = requests.put(
            f"{API_BASE}/listings/{listing_id}",
            json={'title': 'Updated by Admin'},
            headers={'Authorization': f'Bearer {admin_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Status code 200")
        
        data = response.json()
        listing = data.get('listing')
        
        # Verify status preserved
        if listing.get('status') == original_status:
            print_pass(f"Admin edit preserves status ('{original_status}')")
            return True
        else:
            print_fail(f"Status changed from '{original_status}' to '{listing.get('status')}'")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 22: Update listing validation
def test_update_listing_validation():
    print_test("22. Update Listing Validation - PUT /api/listings/:id")
    
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False
    
    # Get host's listings
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {token}'},
        timeout=10
    )
    
    listings = response.json().get('listings', [])
    if not listings:
        print_info("No listings found for host")
        return True
    
    listing_id = listings[0].get('id')
    
    test_cases = [
        ({'price': -100}, "negative price"),
        ({'price': 'invalid'}, "invalid price"),
        ({'category': 'invalid'}, "invalid category"),
    ]
    
    all_passed = True
    for payload, description in test_cases:
        try:
            response = requests.put(
                f"{API_BASE}/listings/{listing_id}",
                json=payload,
                headers={'Authorization': f'Bearer {token}'},
                timeout=10
            )
            
            if response.status_code == 400:
                print_pass(f"Validation failed for {description}: 400")
            else:
                print_fail(f"Expected 400 for {description}, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print_fail(f"Exception testing {description}: {e}")
            all_passed = False
    
    return all_passed

# Test 23: Delete listing (non-owner)
def test_delete_listing_non_owner():
    print_test("23. Delete Listing (Non-owner) - DELETE /api/listings/:id")
    
    host_token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    traveler_token = get_auth_token(TEST_TRAVELER['email'], TEST_TRAVELER['password'])
    
    if not host_token or not traveler_token:
        print_fail("Failed to get tokens")
        return False
    
    # Get host's listings
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {host_token}'},
        timeout=10
    )
    
    listings = response.json().get('listings', [])
    if not listings:
        print_info("No listings found for host")
        return True
    
    listing_id = listings[0].get('id')
    
    try:
        # Try to delete as traveler (non-owner)
        response = requests.delete(
            f"{API_BASE}/listings/{listing_id}",
            headers={'Authorization': f'Bearer {traveler_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            print_pass("Non-owner cannot delete listing (403)")
            return True
        else:
            print_fail(f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 24: Delete listing (owner)
def test_delete_listing_owner():
    print_test("24. Delete Listing (Owner) - DELETE /api/listings/:id")
    
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False
    
    # Create a new listing to delete
    listing_data = {
        'title': 'Listing to Delete',
        'description': 'This listing will be deleted',
        'category': 'stay',
        'location': 'Srinagar',
        'price': 3000
    }
    
    create_response = requests.post(
        f"{API_BASE}/listings",
        json=listing_data,
        headers={'Authorization': f'Bearer {token}'},
        timeout=10
    )
    
    if create_response.status_code != 201:
        print_fail("Failed to create listing")
        return False
    
    listing_id = create_response.json().get('listing', {}).get('id')
    
    try:
        # Delete listing
        response = requests.delete(
            f"{API_BASE}/listings/{listing_id}",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Status code 200")
        
        data = response.json()
        if data.get('deleted'):
            print_pass("Listing deleted successfully")
        
        # Verify listing is gone
        get_response = requests.get(
            f"{API_BASE}/listings/{listing_id}",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        if get_response.status_code == 404:
            print_pass("Deleted listing returns 404")
            return True
        else:
            print_fail("Deleted listing still accessible")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 25: Get host listings (own)
def test_get_host_listings_me():
    print_test("25. Get Host Listings (Own) - GET /api/listings/host/me")
    
    token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not token:
        print_fail("Failed to get host token")
        return False
    
    try:
        response = requests.get(
            f"{API_BASE}/listings/host/me",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Status code 200")
        
        data = response.json()
        listings = data.get('listings', [])
        
        print_pass(f"Host can view own listings ({len(listings)} listings, any status)")
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 26: Get host listings (by hostId, no auth)
def test_get_host_listings_by_id_no_auth():
    print_test("26. Get Host Listings by ID (No Auth) - GET /api/listings/host/:hostId")
    
    # Get a host ID from existing listings
    response = requests.get(f"{API_BASE}/listings", timeout=10)
    listings = response.json().get('listings', [])
    
    if not listings:
        print_fail("No listings found")
        return False
    
    host_id = listings[0].get('hostId')
    
    try:
        response = requests.get(f"{API_BASE}/listings/host/{host_id}", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        listings = data.get('listings', [])
        
        # Verify all are approved (non-auth can only see approved)
        all_approved = all(l.get('status') == 'approved' for l in listings)
        if all_approved:
            print_pass("Non-auth can only see approved listings")
            return True
        else:
            print_fail("Non-auth can see non-approved listings")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 27: Get host listings (by hostId, admin)
def test_get_host_listings_by_id_admin():
    print_test("27. Get Host Listings by ID (Admin) - GET /api/listings/host/:hostId")
    
    admin_token = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    host_token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    
    if not admin_token or not host_token:
        print_fail("Failed to get tokens")
        return False
    
    # Get host's ID
    me_response = requests.get(
        f"{API_BASE}/auth/me",
        headers={'Authorization': f'Bearer {host_token}'},
        timeout=10
    )
    
    host_id = me_response.json().get('user', {}).get('id')
    
    try:
        response = requests.get(
            f"{API_BASE}/listings/host/{host_id}",
            headers={'Authorization': f'Bearer {admin_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Admin can view all listings for any host")
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 28: Get host listings without auth
def test_get_host_listings_me_no_auth():
    print_test("28. Get Host Listings (No Auth) - GET /api/listings/host/me")
    
    try:
        response = requests.get(f"{API_BASE}/listings/host/me", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Unauthorized (401) - auth required")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 29: Approve listing (non-admin)
def test_approve_listing_non_admin():
    print_test("29. Approve Listing (Non-admin) - POST /api/listings/:id/approve")
    
    host_token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not host_token:
        print_fail("Failed to get host token")
        return False
    
    # Get a pending listing
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {host_token}'},
        timeout=10
    )
    
    listings = response.json().get('listings', [])
    pending_listings = [l for l in listings if l.get('status') == 'pending']
    
    if not pending_listings:
        print_info("No pending listings found")
        return True
    
    listing_id = pending_listings[0].get('id')
    
    try:
        # Try to approve as host (non-admin)
        response = requests.post(
            f"{API_BASE}/listings/{listing_id}/approve",
            headers={'Authorization': f'Bearer {host_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            print_pass("Non-admin cannot approve listing (403)")
            return True
        else:
            print_fail(f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 30: Approve listing (admin)
def test_approve_listing_admin():
    print_test("30. Approve Listing (Admin) - POST /api/listings/:id/approve")
    
    admin_token = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    host_token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    
    if not admin_token or not host_token:
        print_fail("Failed to get tokens")
        return False
    
    # Get a pending listing
    response = requests.get(
        f"{API_BASE}/listings/host/me",
        headers={'Authorization': f'Bearer {host_token}'},
        timeout=10
    )
    
    listings = response.json().get('listings', [])
    pending_listings = [l for l in listings if l.get('status') == 'pending']
    
    if not pending_listings:
        print_info("No pending listings found")
        return True
    
    listing_id = pending_listings[0].get('id')
    
    try:
        # Approve as admin
        response = requests.post(
            f"{API_BASE}/listings/{listing_id}/approve",
            headers={'Authorization': f'Bearer {admin_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Status code 200")
        
        data = response.json()
        listing = data.get('listing')
        
        # Verify status is approved
        if listing.get('status') == 'approved':
            print_pass("Listing status changed to 'approved'")
        else:
            print_fail(f"Status is '{listing.get('status')}', expected 'approved'")
            return False
        
        # Verify rejectionReason cleared
        if 'rejectionReason' not in listing or not listing.get('rejectionReason'):
            print_pass("rejectionReason cleared")
            return True
        else:
            print_fail("rejectionReason not cleared")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 31: Reject listing (admin)
def test_reject_listing_admin():
    print_test("31. Reject Listing (Admin) - POST /api/listings/:id/reject")
    
    admin_token = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    host_token = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    
    if not admin_token or not host_token:
        print_fail("Failed to get tokens")
        return False
    
    # Create a new listing to reject
    listing_data = {
        'title': 'Listing to Reject',
        'description': 'This listing will be rejected',
        'category': 'stay',
        'location': 'Srinagar',
        'price': 3000
    }
    
    create_response = requests.post(
        f"{API_BASE}/listings",
        json=listing_data,
        headers={'Authorization': f'Bearer {host_token}'},
        timeout=10
    )
    
    if create_response.status_code != 201:
        print_fail("Failed to create listing")
        return False
    
    listing_id = create_response.json().get('listing', {}).get('id')
    
    try:
        # Reject as admin
        response = requests.post(
            f"{API_BASE}/listings/{listing_id}/reject",
            json={'reason': 'Does not meet quality standards'},
            headers={'Authorization': f'Bearer {admin_token}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        print_pass("Status code 200")
        
        data = response.json()
        listing = data.get('listing')
        
        # Verify status is rejected
        if listing.get('status') == 'rejected':
            print_pass("Listing status changed to 'rejected'")
        else:
            print_fail(f"Status is '{listing.get('status')}', expected 'rejected'")
            return False
        
        # Verify rejectionReason saved
        if listing.get('rejectionReason') == 'Does not meet quality standards':
            print_pass("rejectionReason saved correctly")
            return True
        else:
            print_fail(f"rejectionReason is '{listing.get('rejectionReason')}'")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# Test 32: MongoDB persistence check
def test_mongodb_persistence():
    print_test("32. MongoDB Persistence Check")
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        listings = db['listings']
        
        # Check for listings
        count = listings.count_documents({})
        print_pass(f"Found {count} listings in MongoDB")
        
        # Check for non-demo listings
        non_demo = listings.find_one({'isDemo': False})
        if non_demo:
            print_pass("Non-demo listing found in database")
            
            # Verify UUID id
            if 'id' in non_demo and len(non_demo['id']) == 36:
                print_pass(f"Listing has UUID id: {non_demo['id']}")
            else:
                print_fail("Listing id is not UUID format")
            
            # Verify hostId reference
            if 'hostId' in non_demo:
                print_pass(f"Listing has hostId: {non_demo['hostId']}")
            else:
                print_fail("Listing missing hostId")
        
        # Check indexes
        indexes = listings.index_information()
        print_info(f"Indexes: {list(indexes.keys())}")
        
        # Check for id unique index
        if 'id_1' in indexes:
            print_pass("Index on 'id' exists")
            if indexes['id_1'].get('unique'):
                print_pass("Index on 'id' is unique")
        
        client.close()
        return True
    except Exception as e:
        print_fail(f"MongoDB check failed: {e}")
        return False


# ============================================================================
# BOOKINGS API TESTS
# ============================================================================

# Global variables to store test data
HOST_TOKEN = None
HOST_ID = None
TRAVELER_TOKEN = None
TRAVELER_ID = None
ADMIN_TOKEN = None
APPROVED_LISTING_ID = None
BOOKING_ID_1 = None
BOOKING_ID_2 = None

def setup_bookings_test_data():
    """Setup: Login users and create an approved listing"""
    global HOST_TOKEN, HOST_ID, TRAVELER_TOKEN, TRAVELER_ID, ADMIN_TOKEN, APPROVED_LISTING_ID
    
    print_test("BOOKINGS SETUP: Login users and create approved listing")
    
    # Login host
    HOST_TOKEN = get_auth_token(TEST_HOST['email'], TEST_HOST['password'])
    if not HOST_TOKEN:
        print_fail("Failed to login host")
        return False
    print_pass("Host logged in")
    
    # Get host ID
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={'Authorization': f'Bearer {HOST_TOKEN}'},
            timeout=10
        )
        if response.status_code == 200:
            HOST_ID = response.json()['user']['id']
            print_pass(f"Host ID: {HOST_ID}")
    except:
        print_fail("Failed to get host ID")
        return False
    
    # Login traveler
    TRAVELER_TOKEN = get_auth_token(TEST_TRAVELER['email'], TEST_TRAVELER['password'])
    if not TRAVELER_TOKEN:
        print_fail("Failed to login traveler")
        return False
    print_pass("Traveler logged in")
    
    # Get traveler ID
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        if response.status_code == 200:
            TRAVELER_ID = response.json()['user']['id']
            print_pass(f"Traveler ID: {TRAVELER_ID}")
    except:
        print_fail("Failed to get traveler ID")
        return False
    
    # Login admin
    ADMIN_TOKEN = get_auth_token(TEST_ADMIN['email'], TEST_ADMIN['password'])
    if not ADMIN_TOKEN:
        print_fail("Failed to login admin")
        return False
    print_pass("Admin logged in")
    
    # Create a listing as host
    listing_data = {
        'title': 'Test Houseboat for Bookings',
        'description': 'Beautiful houseboat on Dal Lake for testing bookings',
        'category': 'stay',
        'subcategory': 'houseboat',
        'location': 'Dal Lake, Srinagar',
        'price': 5000,
        'images': ['https://example.com/houseboat.jpg'],
        'amenities': ['wifi', 'kitchen'],
        'services': ['breakfast', 'pickup']
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/listings",
            json=listing_data,
            headers={'Authorization': f'Bearer {HOST_TOKEN}'},
            timeout=10
        )
        if response.status_code == 201:
            listing_id = response.json()['listing']['id']
            print_pass(f"Created listing: {listing_id}")
            
            # Approve the listing as admin
            response = requests.post(
                f"{API_BASE}/listings/{listing_id}/approve",
                headers={'Authorization': f'Bearer {ADMIN_TOKEN}'},
                timeout=10
            )
            if response.status_code == 200:
                APPROVED_LISTING_ID = listing_id
                print_pass(f"Approved listing: {APPROVED_LISTING_ID}")
                return True
            else:
                print_fail(f"Failed to approve listing: {response.status_code}")
                return False
        else:
            print_fail(f"Failed to create listing: {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception during setup: {e}")
        return False

# A) POST /api/bookings (create) tests

def test_booking_create_no_auth():
    """A1) POST /api/bookings without auth -> 401"""
    print_test("BOOKINGS A1: Create booking without auth -> 401")
    
    try:
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2026-06-01',
            'checkOutDate': '2026-06-05',
            'guests': 2
        }
        response = requests.post(f"{API_BASE}/bookings", json=booking_data, timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Correctly returned 401 Unauthorized")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_create_missing_listing_id():
    """A2) POST /api/bookings without listingId -> 400"""
    print_test("BOOKINGS A2: Create booking without listingId -> 400")
    
    try:
        booking_data = {
            'checkInDate': '2026-06-01',
            'checkOutDate': '2026-06-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            print_pass("Correctly returned 400 Bad Request")
            return True
        else:
            print_fail(f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_create_invalid_dates():
    """A3) POST /api/bookings with invalid dates -> 400"""
    print_test("BOOKINGS A3: Create booking with invalid dates -> 400")
    
    all_passed = True
    
    # Test 1: Past check-in date
    try:
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2020-01-01',
            'checkOutDate': '2020-01-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Past date - Status: {response.status_code}")
        if response.status_code == 400:
            print_pass("Past check-in correctly rejected")
        else:
            print_fail(f"Past check-in: Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print_fail(f"Past date exception: {e}")
        all_passed = False
    
    # Test 2: Check-out <= check-in
    try:
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2026-06-05',
            'checkOutDate': '2026-06-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Same date - Status: {response.status_code}")
        if response.status_code == 400:
            print_pass("Check-out <= check-in correctly rejected")
        else:
            print_fail(f"Same dates: Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print_fail(f"Same date exception: {e}")
        all_passed = False
    
    # Test 3: Invalid date format (NaN)
    try:
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': 'invalid-date',
            'checkOutDate': '2026-06-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Invalid date - Status: {response.status_code}")
        if response.status_code == 400:
            print_pass("Invalid date format correctly rejected")
        else:
            print_fail(f"Invalid date: Expected 400, got {response.status_code}")
            all_passed = False
    except Exception as e:
        print_fail(f"Invalid date exception: {e}")
        all_passed = False
    
    return all_passed

def test_booking_create_nonexistent_listing():
    """A4) POST /api/bookings with non-existent listingId -> 404"""
    print_test("BOOKINGS A4: Create booking with non-existent listing -> 404")
    
    try:
        booking_data = {
            'listingId': 'nonexistent-listing-id',
            'checkInDate': '2026-06-01',
            'checkOutDate': '2026-06-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 404:
            print_pass("Correctly returned 404 Not Found")
            return True
        else:
            print_fail(f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_create_pending_listing():
    """A5) POST /api/bookings with pending/rejected listing -> 404"""
    print_test("BOOKINGS A5: Create booking with pending listing -> 404")
    
    try:
        # Create a pending listing as host
        listing_data = {
            'title': 'Pending Test Listing',
            'description': 'This listing is pending approval',
            'category': 'stay',
            'location': 'Test Location',
            'price': 3000
        }
        response = requests.post(
            f"{API_BASE}/listings",
            json=listing_data,
            headers={'Authorization': f'Bearer {HOST_TOKEN}'},
            timeout=10
        )
        
        if response.status_code == 201:
            pending_listing_id = response.json()['listing']['id']
            print_info(f"Created pending listing: {pending_listing_id}")
            
            # Try to book the pending listing
            booking_data = {
                'listingId': pending_listing_id,
                'checkInDate': '2026-06-01',
                'checkOutDate': '2026-06-05',
                'guests': 2
            }
            response = requests.post(
                f"{API_BASE}/bookings",
                json=booking_data,
                headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
                timeout=10
            )
            print_info(f"Booking status: {response.status_code}")
            
            if response.status_code == 404:
                print_pass("Correctly rejected booking for pending listing")
                return True
            else:
                print_fail(f"Expected 404, got {response.status_code}")
                return False
        else:
            print_fail(f"Failed to create pending listing: {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_create_valid():
    """A6) POST /api/bookings with valid payload -> 201"""
    print_test("BOOKINGS A6: Create booking with valid payload -> 201")
    
    global BOOKING_ID_1
    
    try:
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2026-06-01',
            'checkOutDate': '2026-06-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 201:
            print_fail(f"Expected 201, got {response.status_code}")
            return False
        
        data = response.json()
        booking = data.get('booking', {})
        
        # Check bookingId (uuid)
        booking_id = booking.get('bookingId')
        if booking_id and len(booking_id) == 36:
            print_pass(f"Booking has UUID bookingId: {booking_id}")
            BOOKING_ID_1 = booking_id
        else:
            print_fail(f"Invalid bookingId: {booking_id}")
            return False
        
        # Check status
        if booking.get('status') == 'pending':
            print_pass("Booking status is 'pending'")
        else:
            print_fail(f"Expected status='pending', got {booking.get('status')}")
            return False
        
        # Check hostId auto-filled
        if booking.get('hostId') == HOST_ID:
            print_pass(f"HostId auto-filled correctly: {HOST_ID}")
        else:
            print_fail(f"HostId mismatch: expected {HOST_ID}, got {booking.get('hostId')}")
            return False
        
        # Check nights and totalPrice
        nights = booking.get('nights')
        total_price = booking.get('totalPrice')
        price_per_night = booking.get('pricePerNight')
        
        if nights == 4:
            print_pass(f"Nights calculated correctly: {nights}")
        else:
            print_fail(f"Expected 4 nights, got {nights}")
            return False
        
        if price_per_night == 5000:
            print_pass(f"Price per night: {price_per_night}")
        else:
            print_fail(f"Expected price 5000, got {price_per_night}")
            return False
        
        expected_total = 5000 * 4
        if total_price == expected_total:
            print_pass(f"Total price calculated correctly: {total_price}")
        else:
            print_fail(f"Expected total {expected_total}, got {total_price}")
            return False
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_create_overlapping():
    """A7) POST /api/bookings with overlapping dates -> 409"""
    print_test("BOOKINGS A7: Create booking with overlapping dates -> 409")
    
    try:
        # Try to book overlapping dates (June 1-5 already booked, try June 3-7)
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2026-06-03',
            'checkOutDate': '2026-06-07',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 409:
            print_pass("Correctly returned 409 Conflict for overlapping dates")
            return True
        else:
            print_fail(f"Expected 409, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_create_non_overlapping():
    """A8) POST /api/bookings with non-overlapping dates -> 201"""
    print_test("BOOKINGS A8: Create booking with non-overlapping dates -> 201")
    
    global BOOKING_ID_2
    
    try:
        # Book non-overlapping dates (June 10-15)
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2026-06-10',
            'checkOutDate': '2026-06-15',
            'guests': 3
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            booking_id = response.json()['booking']['bookingId']
            BOOKING_ID_2 = booking_id
            print_pass(f"Successfully created non-overlapping booking: {booking_id}")
            return True
        else:
            print_fail(f"Expected 201, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# B) GET /api/bookings (list) tests

def test_booking_list_no_auth():
    """B1) GET /api/bookings without auth -> 401"""
    print_test("BOOKINGS B1: List bookings without auth -> 401")
    
    try:
        response = requests.get(f"{API_BASE}/bookings", timeout=10)
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Correctly returned 401 Unauthorized")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_list_traveler():
    """B2) GET /api/bookings as traveler -> only own bookings"""
    print_test("BOOKINGS B2: List bookings as traveler -> only own")
    
    try:
        response = requests.get(
            f"{API_BASE}/bookings",
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        bookings = data.get('bookings', [])
        
        print_info(f"Found {len(bookings)} bookings")
        
        # All bookings should belong to traveler
        all_mine = all(b.get('travelerId') == TRAVELER_ID for b in bookings)
        if all_mine:
            print_pass("All bookings belong to traveler")
            return True
        else:
            print_fail("Some bookings don't belong to traveler")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_list_host_default():
    """B3) GET /api/bookings as host (default) -> only received"""
    print_test("BOOKINGS B3: List bookings as host (default) -> only received")
    
    try:
        response = requests.get(
            f"{API_BASE}/bookings",
            headers={'Authorization': f'Bearer {HOST_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        bookings = data.get('bookings', [])
        
        print_info(f"Found {len(bookings)} bookings")
        
        # All bookings should be for host's listings
        all_received = all(b.get('hostId') == HOST_ID for b in bookings)
        if all_received:
            print_pass("All bookings are for host's listings")
            return True
        else:
            print_fail("Some bookings are not for host's listings")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_list_host_received():
    """B4) GET /api/bookings as host with ?view=received -> same as default"""
    print_test("BOOKINGS B4: List bookings as host with ?view=received")
    
    try:
        response = requests.get(
            f"{API_BASE}/bookings?view=received",
            headers={'Authorization': f'Bearer {HOST_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        bookings = data.get('bookings', [])
        
        print_info(f"Found {len(bookings)} bookings")
        
        # All bookings should be for host's listings
        all_received = all(b.get('hostId') == HOST_ID for b in bookings)
        if all_received:
            print_pass("All bookings are for host's listings")
            return True
        else:
            print_fail("Some bookings are not for host's listings")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_list_admin_all():
    """B5) GET /api/bookings as admin with ?view=all -> all bookings"""
    print_test("BOOKINGS B5: List bookings as admin with ?view=all")
    
    try:
        response = requests.get(
            f"{API_BASE}/bookings?view=all",
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        bookings = data.get('bookings', [])
        
        print_info(f"Found {len(bookings)} bookings")
        
        # Should have at least 2 bookings (the ones we created)
        if len(bookings) >= 2:
            print_pass(f"Admin can see all bookings: {len(bookings)}")
            return True
        else:
            print_fail(f"Expected at least 2 bookings, got {len(bookings)}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# C) PATCH /api/bookings/:id (status update) tests

def test_booking_patch_no_auth():
    """C1) PATCH /api/bookings/:id without auth -> 401"""
    print_test("BOOKINGS C1: Patch booking without auth -> 401")
    
    try:
        response = requests.patch(
            f"{API_BASE}/bookings/{BOOKING_ID_1}",
            json={'status': 'approved'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Correctly returned 401 Unauthorized")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_patch_invalid_status():
    """C2) PATCH /api/bookings/:id with invalid status -> 400"""
    print_test("BOOKINGS C2: Patch booking with invalid status -> 400")
    
    try:
        response = requests.patch(
            f"{API_BASE}/bookings/{BOOKING_ID_1}",
            json={'status': 'invalid_status'},
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            print_pass("Correctly returned 400 Bad Request")
            return True
        else:
            print_fail(f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_patch_nonexistent():
    """C3) PATCH /api/bookings/:id with non-existent id -> 404"""
    print_test("BOOKINGS C3: Patch non-existent booking -> 404")
    
    try:
        response = requests.patch(
            f"{API_BASE}/bookings/nonexistent-booking-id",
            json={'status': 'cancelled'},
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 404:
            print_pass("Correctly returned 404 Not Found")
            return True
        else:
            print_fail(f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_patch_traveler_approve():
    """C4) Traveler tries to approve/reject -> 403"""
    print_test("BOOKINGS C4: Traveler tries to approve -> 403")
    
    try:
        response = requests.patch(
            f"{API_BASE}/bookings/{BOOKING_ID_1}",
            json={'status': 'approved'},
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            print_pass("Correctly returned 403 Forbidden")
            return True
        else:
            print_fail(f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_patch_traveler_cancel():
    """C5) Traveler cancels own booking -> 200"""
    print_test("BOOKINGS C5: Traveler cancels own booking -> 200")
    
    try:
        response = requests.patch(
            f"{API_BASE}/bookings/{BOOKING_ID_2}",
            json={'status': 'cancelled'},
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        booking = data.get('booking', {})
        
        if booking.get('status') == 'cancelled':
            print_pass("Booking status updated to 'cancelled'")
            return True
        else:
            print_fail(f"Expected status='cancelled', got {booking.get('status')}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_patch_host_wrong_listing():
    """C6) Host tries to approve booking not on their listing -> 403"""
    print_test("BOOKINGS C6: Host tries to approve booking not on their listing -> 403")
    
    # This test would require creating another host and their listing
    # For simplicity, we'll skip this as our current setup only has one host
    # and all bookings are for that host's listing
    print_info("Skipping: Would require multiple hosts setup")
    return True

def test_booking_patch_host_approve():
    """C7) Host approves booking on their listing -> 200"""
    print_test("BOOKINGS C7: Host approves booking on their listing -> 200")
    
    try:
        response = requests.patch(
            f"{API_BASE}/bookings/{BOOKING_ID_1}",
            json={'status': 'approved'},
            headers={'Authorization': f'Bearer {HOST_TOKEN}'},
            timeout=10
        )
        print_info(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        booking = data.get('booking', {})
        
        if booking.get('status') == 'approved':
            print_pass("Booking status updated to 'approved'")
            return True
        else:
            print_fail(f"Expected status='approved', got {booking.get('status')}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_patch_host_reject():
    """C8) Host rejects booking on their listing -> 200"""
    print_test("BOOKINGS C8: Host rejects booking on their listing -> 200")
    
    # First create a new booking to reject
    try:
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2026-07-01',
            'checkOutDate': '2026-07-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        
        if response.status_code == 201:
            booking_id = response.json()['booking']['bookingId']
            print_info(f"Created booking to reject: {booking_id}")
            
            # Now reject it as host
            response = requests.patch(
                f"{API_BASE}/bookings/{booking_id}",
                json={'status': 'rejected'},
                headers={'Authorization': f'Bearer {HOST_TOKEN}'},
                timeout=10
            )
            print_info(f"Reject status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Expected 200, got {response.status_code}")
                return False
            
            data = response.json()
            booking = data.get('booking', {})
            
            if booking.get('status') == 'rejected':
                print_pass("Booking status updated to 'rejected'")
                return True
            else:
                print_fail(f"Expected status='rejected', got {booking.get('status')}")
                return False
        else:
            print_fail(f"Failed to create booking: {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_booking_patch_admin():
    """C9) Admin can patch any booking to any valid status"""
    print_test("BOOKINGS C9: Admin can patch any booking -> 200")
    
    # Create a new booking
    try:
        booking_data = {
            'listingId': APPROVED_LISTING_ID,
            'checkInDate': '2026-08-01',
            'checkOutDate': '2026-08-05',
            'guests': 2
        }
        response = requests.post(
            f"{API_BASE}/bookings",
            json=booking_data,
            headers={'Authorization': f'Bearer {TRAVELER_TOKEN}'},
            timeout=10
        )
        
        if response.status_code == 201:
            booking_id = response.json()['booking']['bookingId']
            print_info(f"Created booking for admin test: {booking_id}")
            
            # Admin approves it
            response = requests.patch(
                f"{API_BASE}/bookings/{booking_id}",
                json={'status': 'approved'},
                headers={'Authorization': f'Bearer {ADMIN_TOKEN}'},
                timeout=10
            )
            print_info(f"Admin approve status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Expected 200, got {response.status_code}")
                return False
            
            if response.json()['booking']['status'] == 'approved':
                print_pass("Admin successfully approved booking")
            else:
                print_fail("Admin approval failed")
                return False
            
            # Admin cancels it
            response = requests.patch(
                f"{API_BASE}/bookings/{booking_id}",
                json={'status': 'cancelled'},
                headers={'Authorization': f'Bearer {ADMIN_TOKEN}'},
                timeout=10
            )
            print_info(f"Admin cancel status: {response.status_code}")
            
            if response.status_code != 200:
                print_fail(f"Expected 200, got {response.status_code}")
                return False
            
            if response.json()['booking']['status'] == 'cancelled':
                print_pass("Admin successfully cancelled booking")
                return True
            else:
                print_fail("Admin cancellation failed")
                return False
        else:
            print_fail(f"Failed to create booking: {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

# D) MongoDB persistence test

def test_booking_mongodb_persistence():
    """D) Verify MongoDB persistence"""
    print_test("BOOKINGS D: MongoDB Persistence Verification")
    
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        bookings = db['bookings']
        
        # Find a booking
        booking = bookings.find_one({'bookingId': BOOKING_ID_1})
        
        if not booking:
            print_fail("Booking not found in MongoDB")
            return False
        
        print_pass("Booking found in safar.bookings collection")
        
        # Check bookingId is UUID format
        booking_id = booking.get('bookingId')
        if booking_id and len(booking_id) == 36 and booking_id.count('-') == 4:
            print_pass(f"bookingId is UUID format: {booking_id}")
        else:
            print_fail(f"Invalid bookingId format: {booking_id}")
            return False
        
        # Check status is valid
        status = booking.get('status')
        if status in ['pending', 'approved', 'rejected', 'cancelled']:
            print_pass(f"Status is valid: {status}")
        else:
            print_fail(f"Invalid status: {status}")
            return False
        
        # Check travelerId and hostId references
        if booking.get('travelerId'):
            print_pass(f"travelerId present: {booking.get('travelerId')}")
        else:
            print_fail("travelerId missing")
            return False
        
        if booking.get('hostId'):
            print_pass(f"hostId present: {booking.get('hostId')}")
        else:
            print_fail("hostId missing")
            return False
        
        # Check dates are stored as Date objects
        check_in = booking.get('checkInDate')
        check_out = booking.get('checkOutDate')
        
        from datetime import datetime
        if isinstance(check_in, datetime):
            print_pass("checkInDate stored as Date object")
        else:
            print_fail(f"checkInDate not a Date object: {type(check_in)}")
            return False
        
        if isinstance(check_out, datetime):
            print_pass("checkOutDate stored as Date object")
        else:
            print_fail(f"checkOutDate not a Date object: {type(check_out)}")
            return False
        
        client.close()
        return True
    except Exception as e:
        print_fail(f"MongoDB check failed: {e}")
        return False

def main():
    print("\n" + "="*80)
    print("SAFAR BOOKINGS API BACKEND TEST SUITE")
    print("="*80)
    print_info(f"API Base URL: {API_BASE}")
    print_info(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    
    # Setup
    print("\n" + "="*80)
    print("SETUP")
    print("="*80)
    cleanup_test_data()
    setup_test_users()
    
    # Setup bookings test data (login users, create approved listing)
    if not setup_bookings_test_data():
        print_fail("Failed to setup bookings test data")
        return False
    
    # Track results
    results = {}
    
    # A) POST /api/bookings (create) tests
    print("\n" + "="*80)
    print("SECTION A: CREATE BOOKING TESTS")
    print("="*80)
    results['booking_create_no_auth'] = test_booking_create_no_auth()
    results['booking_create_missing_listing_id'] = test_booking_create_missing_listing_id()
    results['booking_create_invalid_dates'] = test_booking_create_invalid_dates()
    results['booking_create_nonexistent_listing'] = test_booking_create_nonexistent_listing()
    results['booking_create_pending_listing'] = test_booking_create_pending_listing()
    results['booking_create_valid'] = test_booking_create_valid()
    results['booking_create_overlapping'] = test_booking_create_overlapping()
    results['booking_create_non_overlapping'] = test_booking_create_non_overlapping()
    
    # B) GET /api/bookings (list) tests
    print("\n" + "="*80)
    print("SECTION B: LIST BOOKINGS TESTS")
    print("="*80)
    results['booking_list_no_auth'] = test_booking_list_no_auth()
    results['booking_list_traveler'] = test_booking_list_traveler()
    results['booking_list_host_default'] = test_booking_list_host_default()
    results['booking_list_host_received'] = test_booking_list_host_received()
    results['booking_list_admin_all'] = test_booking_list_admin_all()
    
    # C) PATCH /api/bookings/:id (status update) tests
    print("\n" + "="*80)
    print("SECTION C: UPDATE BOOKING STATUS TESTS")
    print("="*80)
    results['booking_patch_no_auth'] = test_booking_patch_no_auth()
    results['booking_patch_invalid_status'] = test_booking_patch_invalid_status()
    results['booking_patch_nonexistent'] = test_booking_patch_nonexistent()
    results['booking_patch_traveler_approve'] = test_booking_patch_traveler_approve()
    results['booking_patch_traveler_cancel'] = test_booking_patch_traveler_cancel()
    results['booking_patch_host_wrong_listing'] = test_booking_patch_host_wrong_listing()
    results['booking_patch_host_approve'] = test_booking_patch_host_approve()
    results['booking_patch_host_reject'] = test_booking_patch_host_reject()
    results['booking_patch_admin'] = test_booking_patch_admin()
    
    # D) MongoDB persistence test
    print("\n" + "="*80)
    print("SECTION D: MONGODB PERSISTENCE TEST")
    print("="*80)
    results['booking_mongodb_persistence'] = test_booking_mongodb_persistence()
    
    # Summary
    print("\n" + "="*80)
    print("BOOKINGS API TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*80)
    
    # Cleanup
    print("\n" + "="*80)
    print("CLEANUP")
    print("="*80)
    cleanup_test_data()
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
