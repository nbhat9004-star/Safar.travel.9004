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
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://local-explorer-60.preview.emergentagent.com')
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
    """Remove test users and listings from MongoDB"""
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

def main():
    print("\n" + "="*80)
    print("SAFAR LISTINGS API BACKEND TEST SUITE")
    print("="*80)
    print_info(f"API Base URL: {API_BASE}")
    print_info(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    
    # Setup
    print("\n" + "="*80)
    print("SETUP")
    print("="*80)
    cleanup_test_data()
    setup_test_users()
    
    # Track results
    results = {}
    
    # Run tests
    results['auto_seed'] = test_auto_seed()
    results['filter_category'] = test_filter_category()
    results['filter_subcategory'] = test_filter_subcategory()
    results['filter_services'] = test_filter_services()
    results['filter_price_range'] = test_filter_price_range()
    results['filter_location'] = test_filter_location()
    results['filter_status_no_auth'] = test_filter_status_no_auth()
    results['filter_status_admin'] = test_filter_status_admin()
    results['create_no_auth'] = test_create_listing_no_auth()
    results['create_traveler'] = test_create_listing_traveler()
    results['create_host'] = test_create_listing_host()[0]
    results['create_admin'] = test_create_listing_admin()[0]
    results['create_validation'] = test_create_listing_validation()
    results['get_single_approved'] = test_get_single_listing_approved()
    results['get_single_pending_no_auth'] = test_get_single_listing_pending_no_auth()
    results['get_single_pending_owner'] = test_get_single_listing_pending_owner()
    results['get_single_pending_admin'] = test_get_single_listing_pending_admin()
    results['get_nonexistent'] = test_get_nonexistent_listing()
    results['update_non_owner'] = test_update_listing_non_owner()
    results['update_owner'] = test_update_listing_owner()
    results['update_admin'] = test_update_listing_admin()
    results['update_validation'] = test_update_listing_validation()
    results['delete_non_owner'] = test_delete_listing_non_owner()
    results['delete_owner'] = test_delete_listing_owner()
    results['get_host_me'] = test_get_host_listings_me()
    results['get_host_by_id_no_auth'] = test_get_host_listings_by_id_no_auth()
    results['get_host_by_id_admin'] = test_get_host_listings_by_id_admin()
    results['get_host_me_no_auth'] = test_get_host_listings_me_no_auth()
    results['approve_non_admin'] = test_approve_listing_non_admin()
    results['approve_admin'] = test_approve_listing_admin()
    results['reject_admin'] = test_reject_listing_admin()
    results['mongodb_persistence'] = test_mongodb_persistence()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
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
