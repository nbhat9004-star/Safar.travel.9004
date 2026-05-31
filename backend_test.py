#!/usr/bin/env python3
"""
Comprehensive backend test for Safar authentication system.
Tests all auth endpoints, role-based authorization, and MongoDB persistence.
"""
import os
import sys
import requests
import json
from pymongo import MongoClient
import bcrypt

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://local-explorer-60.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'safar')

# Test data
TEST_TRAVELER = {
    'name': 'Alice Wanderer',
    'email': 'alice.wanderer@safar.test',
    'password': 'secure123',
    'role': 'traveler'
}

TEST_HOST = {
    'name': 'Bob Innkeeper',
    'email': 'bob.innkeeper@safar.test',
    'password': 'secure456',
    'role': 'host'
}

TEST_ADMIN = {
    'name': 'Admin User',
    'email': 'admin@safar.test',
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

def cleanup_test_users():
    """Remove test users from MongoDB before starting tests"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        users = db['users']
        
        test_emails = [
            TEST_TRAVELER['email'],
            TEST_HOST['email'],
            TEST_ADMIN['email']
        ]
        
        result = users.delete_many({'email': {'$in': test_emails}})
        print_info(f"Cleaned up {result.deleted_count} test users from database")
        client.close()
    except Exception as e:
        print_fail(f"Cleanup failed: {e}")

def create_admin_user():
    """Directly insert admin user into MongoDB with bcrypt-hashed password"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        users = db['users']
        
        # Check if admin already exists
        existing = users.find_one({'email': TEST_ADMIN['email']})
        if existing:
            print_info(f"Admin user already exists: {TEST_ADMIN['email']}")
            client.close()
            return existing['id']
        
        # Hash password with bcrypt
        import uuid
        password_hash = bcrypt.hashpw(TEST_ADMIN['password'].encode('utf-8'), bcrypt.gensalt(10)).decode('utf-8')
        
        admin_user = {
            'id': str(uuid.uuid4()),
            'name': TEST_ADMIN['name'],
            'email': TEST_ADMIN['email'].lower(),
            'role': 'admin',
            'passwordHash': password_hash,
            'avatar': f"https://api.dicebear.com/9.x/initials/svg?seed={TEST_ADMIN['name']}&backgroundColor=0F3D2E",
            'createdAt': None,
            'updatedAt': None
        }
        
        users.insert_one(admin_user)
        print_info(f"Created admin user in MongoDB: {TEST_ADMIN['email']}")
        client.close()
        return admin_user['id']
    except Exception as e:
        print_fail(f"Failed to create admin user: {e}")
        return None

def verify_mongodb_persistence(email):
    """Verify user exists in MongoDB with proper bcrypt hash"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        users = db['users']
        
        user = users.find_one({'email': email.lower()})
        client.close()
        
        if not user:
            print_fail(f"User not found in MongoDB: {email}")
            return False
        
        print_pass(f"User found in MongoDB: {email}")
        
        # Check password hash format (bcrypt starts with $2a$, $2b$, or $2y$)
        if 'passwordHash' in user and user['passwordHash'].startswith('$2'):
            print_pass(f"Password is bcrypt-hashed (starts with $2)")
        else:
            print_fail(f"Password hash format incorrect: {user.get('passwordHash', 'MISSING')[:20]}")
            return False
        
        # Verify no plain password field
        if 'password' in user:
            print_fail("Plain 'password' field found in database (security issue)")
            return False
        else:
            print_pass("No plain password field in database")
        
        # Verify email is lowercased
        if user['email'] == email.lower():
            print_pass(f"Email is lowercased: {user['email']}")
        else:
            print_fail(f"Email not lowercased: {user['email']}")
        
        # Verify role
        if 'role' in user:
            print_pass(f"User role: {user['role']}")
        
        # Verify UUID id
        if 'id' in user and len(user['id']) == 36:
            print_pass(f"User has UUID id: {user['id']}")
        
        return True
    except Exception as e:
        print_fail(f"MongoDB verification failed: {e}")
        return False

def verify_jwt_structure(token):
    """Verify JWT has 3 dot-separated segments"""
    parts = token.split('.')
    if len(parts) == 3:
        print_pass(f"JWT has correct structure (3 segments)")
        return True
    else:
        print_fail(f"JWT structure incorrect: {len(parts)} segments (expected 3)")
        return False

def test_register_happy_path():
    """Test 1: POST /api/auth/register - happy path for traveler"""
    print_test("Register - Happy Path (Traveler)")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=TEST_TRAVELER,
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Status code 200")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            print_info(f"Response: {data}")
            return False
        
        if data.get('ok'):
            print_pass("Response has ok: true")
        else:
            print_fail("Response missing ok: true")
            return False
        
        user = data.get('user')
        if user:
            print_pass("Response contains user object")
            
            if user.get('role') == 'traveler':
                print_pass(f"User role is 'traveler'")
            else:
                print_fail(f"User role is '{user.get('role')}', expected 'traveler'")
            
            if user.get('email') == TEST_TRAVELER['email'].lower():
                print_pass(f"Email is lowercased: {user.get('email')}")
            else:
                print_fail(f"Email not lowercased: {user.get('email')}")
            
            if 'id' in user and len(user['id']) == 36:
                print_pass(f"User has UUID id")
            else:
                print_fail(f"User id format incorrect")
            
            if 'passwordHash' not in user and 'password' not in user:
                print_pass("No password fields in response (security)")
            else:
                print_fail("Password fields exposed in response")
        else:
            print_fail("Response missing user object")
            return False
        
        token = data.get('token')
        if token:
            print_pass("Response contains token")
            verify_jwt_structure(token)
        else:
            print_fail("Response missing token")
        
        # Check cookie
        if 'safar_token' in response.cookies:
            print_pass("safar_token cookie set")
        else:
            print_fail("safar_token cookie not set")
        
        # Verify MongoDB persistence
        verify_mongodb_persistence(TEST_TRAVELER['email'])
        
        return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_register_host():
    """Test: POST /api/auth/register - happy path for host"""
    print_test("Register - Happy Path (Host)")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=TEST_HOST,
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Status code 200")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        user = data.get('user')
        if user and user.get('role') == 'host':
            print_pass(f"User role is 'host'")
            return True
        else:
            print_fail(f"User role is '{user.get('role') if user else 'MISSING'}', expected 'host'")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_register_duplicate_email():
    """Test 2: POST /api/auth/register - duplicate email returns 409"""
    print_test("Register - Duplicate Email")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=TEST_TRAVELER,
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 409:
            print_pass("Status code 409 (Conflict)")
            data = response.json()
            if 'error' in data:
                print_pass(f"Error message: {data['error']}")
            return True
        else:
            print_fail(f"Expected 409, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_register_validation():
    """Test 3: POST /api/auth/register - validation errors return 400"""
    print_test("Register - Validation Errors")
    
    test_cases = [
        ({'name': 'A', 'email': 'test@test.com', 'password': 'secure123'}, "short name"),
        ({'name': 'Valid Name', 'email': 'invalid-email', 'password': 'secure123'}, "invalid email"),
        ({'name': 'Valid Name', 'email': 'test@test.com', 'password': '12345'}, "short password"),
        ({'email': 'test@test.com', 'password': 'secure123'}, "missing name"),
    ]
    
    all_passed = True
    for payload, description in test_cases:
        try:
            response = requests.post(
                f"{API_BASE}/auth/register",
                json=payload,
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

def test_register_role_coercion():
    """Test 4: POST /api/auth/register - admin role coerced to traveler"""
    print_test("Register - Role Coercion (admin -> traveler)")
    
    try:
        admin_attempt = {
            'name': 'Fake Admin',
            'email': 'fake.admin@safar.test',
            'password': 'secure999',
            'role': 'admin'
        }
        
        response = requests.post(
            f"{API_BASE}/auth/register",
            json=admin_attempt,
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Registration succeeded")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        user = data.get('user')
        if user and user.get('role') == 'traveler':
            print_pass(f"Role coerced from 'admin' to 'traveler'")
            
            # Cleanup
            client = MongoClient(MONGO_URL)
            db = client[DB_NAME]
            db['users'].delete_one({'email': admin_attempt['email'].lower()})
            client.close()
            
            return True
        else:
            print_fail(f"Role is '{user.get('role') if user else 'MISSING'}', expected 'traveler'")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_login_valid():
    """Test 5: POST /api/auth/login - valid credentials return 200 + JWT cookie"""
    print_test("Login - Valid Credentials")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={
                'email': TEST_TRAVELER['email'],
                'password': TEST_TRAVELER['password']
            },
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Status code 200")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            print_info(f"Response: {data}")
            return False, None
        
        if data.get('ok'):
            print_pass("Response has ok: true")
        
        token = data.get('token')
        if token:
            print_pass("Response contains token")
            verify_jwt_structure(token)
        else:
            print_fail("Response missing token")
        
        if 'safar_token' in response.cookies:
            print_pass("safar_token cookie set")
            return True, response.cookies.get('safar_token')
        else:
            print_fail("safar_token cookie not set")
            return False, None
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False, None

def test_login_wrong_password():
    """Test 6: POST /api/auth/login - wrong password returns 401"""
    print_test("Login - Wrong Password")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={
                'email': TEST_TRAVELER['email'],
                'password': 'wrongpassword'
            },
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Status code 401 (Unauthorized)")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_login_unknown_email():
    """Test 7: POST /api/auth/login - unknown email returns 401"""
    print_test("Login - Unknown Email")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={
                'email': 'nonexistent@safar.test',
                'password': 'anypassword'
            },
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Status code 401 (Unauthorized)")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_logout():
    """Test 8: POST /api/auth/logout - clears cookie"""
    print_test("Logout - Cookie Cleared")
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/logout",
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print_pass("Status code 200")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        # Check if cookie is cleared (Max-Age=0)
        if 'safar_token' in response.cookies:
            cookie = response.cookies.get('safar_token')
            if cookie == '' or not cookie:
                print_pass("safar_token cookie cleared (empty value)")
                return True
            else:
                print_fail(f"safar_token cookie not cleared: {cookie}")
                return False
        else:
            # Cookie might not be in response if already cleared
            print_pass("safar_token cookie cleared")
            return True
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_me_no_auth():
    """Test 9: GET /api/auth/me - no auth returns 401"""
    print_test("GET /api/auth/me - No Authentication")
    
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Status code 401 (Unauthorized)")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_me_with_cookie():
    """Test 10: GET /api/auth/me - with cookie returns 200 + user"""
    print_test("GET /api/auth/me - With Cookie")
    
    # First login to get cookie
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            'email': TEST_TRAVELER['email'],
            'password': TEST_TRAVELER['password']
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        print_fail("Failed to login for cookie test")
        return False
    
    cookies = login_response.cookies
    
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            cookies=cookies,
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Status code 200")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        user = data.get('user')
        if user:
            print_pass(f"User returned: {user.get('email')}")
            return True
        else:
            print_fail("No user in response")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_me_with_bearer_token():
    """Test 11: GET /api/auth/me - with Bearer token returns 200 + user"""
    print_test("GET /api/auth/me - With Bearer Token")
    
    # First login to get token
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            'email': TEST_TRAVELER['email'],
            'password': TEST_TRAVELER['password']
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        print_fail("Failed to login for bearer token test")
        return False
    
    token = login_response.json().get('token')
    if not token:
        print_fail("No token in login response")
        return False
    
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Status code 200")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
        
        user = data.get('user')
        if user:
            print_pass(f"User returned: {user.get('email')}")
            return True
        else:
            print_fail("No user in response")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_protected_users_no_auth():
    """Test 12: GET /api/users - no auth returns 401"""
    print_test("GET /api/users (admin-only) - No Auth")
    
    try:
        response = requests.get(
            f"{API_BASE}/users",
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print_pass("Status code 401 (Unauthorized)")
            return True
        else:
            print_fail(f"Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_protected_users_traveler():
    """Test 13: GET /api/users - traveler returns 403"""
    print_test("GET /api/users (admin-only) - Traveler Role")
    
    # Login as traveler
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            'email': TEST_TRAVELER['email'],
            'password': TEST_TRAVELER['password']
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        print_fail("Failed to login as traveler")
        return False
    
    token = login_response.json().get('token')
    
    try:
        response = requests.get(
            f"{API_BASE}/users",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            print_pass("Status code 403 (Forbidden)")
            return True
        else:
            print_fail(f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_protected_users_admin():
    """Test 14: GET /api/users - admin returns 200 + users list"""
    print_test("GET /api/users (admin-only) - Admin Role")
    
    # Login as admin
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            'email': TEST_ADMIN['email'],
            'password': TEST_ADMIN['password']
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        print_fail("Failed to login as admin")
        print_info(f"Response: {login_response.json()}")
        return False
    
    token = login_response.json().get('token')
    
    try:
        response = requests.get(
            f"{API_BASE}/users",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Status code 200")
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            print_info(f"Response: {data}")
            return False
        
        users = data.get('users')
        if users and isinstance(users, list):
            print_pass(f"Users list returned ({len(users)} users)")
            return True
        else:
            print_fail("No users list in response")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_protected_host_me_traveler():
    """Test 15: GET /api/host/me - traveler returns 403"""
    print_test("GET /api/host/me (host/admin only) - Traveler Role")
    
    # Login as traveler
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            'email': TEST_TRAVELER['email'],
            'password': TEST_TRAVELER['password']
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        print_fail("Failed to login as traveler")
        return False
    
    token = login_response.json().get('token')
    
    try:
        response = requests.get(
            f"{API_BASE}/host/me",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            print_pass("Status code 403 (Forbidden)")
            return True
        else:
            print_fail(f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_protected_host_me_host():
    """Test 16: GET /api/host/me - host returns 200"""
    print_test("GET /api/host/me (host/admin only) - Host Role")
    
    # Login as host
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            'email': TEST_HOST['email'],
            'password': TEST_HOST['password']
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        print_fail("Failed to login as host")
        return False
    
    token = login_response.json().get('token')
    
    try:
        response = requests.get(
            f"{API_BASE}/host/me",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            print_pass("Status code 200")
            return True
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def test_protected_traveler_me_any_auth():
    """Test 17: GET /api/traveler/me - any authenticated user returns 200"""
    print_test("GET /api/traveler/me (any auth) - Traveler Role")
    
    # Login as traveler
    login_response = requests.post(
        f"{API_BASE}/auth/login",
        json={
            'email': TEST_TRAVELER['email'],
            'password': TEST_TRAVELER['password']
        },
        timeout=10
    )
    
    if login_response.status_code != 200:
        print_fail("Failed to login as traveler")
        return False
    
    token = login_response.json().get('token')
    
    try:
        response = requests.get(
            f"{API_BASE}/traveler/me",
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print_info(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print_pass("Status code 200")
            return True
        else:
            print_fail(f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False

def main():
    print("\n" + "="*80)
    print("SAFAR AUTHENTICATION BACKEND TEST SUITE")
    print("="*80)
    print_info(f"API Base URL: {API_BASE}")
    print_info(f"MongoDB: {MONGO_URL}/{DB_NAME}")
    
    # Cleanup and setup
    print("\n" + "="*80)
    print("SETUP")
    print("="*80)
    cleanup_test_users()
    create_admin_user()
    
    # Track results
    results = {}
    
    # Run tests
    results['register_traveler'] = test_register_happy_path()
    results['register_host'] = test_register_host()
    results['register_duplicate'] = test_register_duplicate_email()
    results['register_validation'] = test_register_validation()
    results['register_role_coercion'] = test_register_role_coercion()
    results['login_valid'] = test_login_valid()[0]
    results['login_wrong_password'] = test_login_wrong_password()
    results['login_unknown_email'] = test_login_unknown_email()
    results['logout'] = test_logout()
    results['me_no_auth'] = test_me_no_auth()
    results['me_with_cookie'] = test_me_with_cookie()
    results['me_with_bearer'] = test_me_with_bearer_token()
    results['users_no_auth'] = test_protected_users_no_auth()
    results['users_traveler'] = test_protected_users_traveler()
    results['users_admin'] = test_protected_users_admin()
    results['host_me_traveler'] = test_protected_host_me_traveler()
    results['host_me_host'] = test_protected_host_me_host()
    results['traveler_me_any'] = test_protected_traveler_me_any_auth()
    
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
    cleanup_test_users()
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
