#!/usr/bin/env python3
"""
CivicConnect Backend API Testing Suite
Tests all major API endpoints for the civic issue reporting platform
"""

import requests
import sys
import json
import uuid
from datetime import datetime

class CivicConnectAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.admin_token = None
        self.officer_token = None
        self.citizen_token = None
        self.test_ticket_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, response_data=None, error_msg=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({
                "test": test_name,
                "error": error_msg,
                "response": response_data
            })
            print(f"❌ {test_name} - FAILED: {error_msg}")

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            if not success:
                return False, f"Expected {expected_status}, got {response.status_code}. Response: {response_data}"
            
            return True, response_data

        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, "Connection error"
        except Exception as e:
            return False, f"Request error: {str(e)}"

    def test_categories(self):
        """Test GET /api/categories"""
        success, result = self.make_request('GET', 'categories')
        if success and isinstance(result, dict) and 'roads_footpaths' in result:
            self.log_result("GET /api/categories", True)
            return True
        else:
            self.log_result("GET /api/categories", False, result, "Categories not returned properly")
            return False

    def test_admin_login(self):
        """Test admin login"""
        data = {
            "email": "admin@civicconnect.gov.in",
            "password": "admin123"
        }
        success, result = self.make_request('POST', 'auth/login', data)
        if success and 'token' in result and result.get('role') == 'admin':
            self.admin_token = result['token']
            self.log_result("Admin Login", True)
            return True
        else:
            self.log_result("Admin Login", False, result, "Admin login failed or invalid response")
            return False

    def test_officer_login(self):
        """Test officer login"""
        data = {
            "email": "officer@civicconnect.gov.in",
            "password": "officer123"
        }
        success, result = self.make_request('POST', 'auth/login', data)
        if success and 'token' in result and result.get('role') == 'officer':
            self.officer_token = result['token']
            self.log_result("Officer Login", True)
            return True
        else:
            self.log_result("Officer Login", False, result, "Officer login failed or invalid response")
            return False

    def test_citizen_register(self):
        """Test citizen registration"""
        test_email = f"test_citizen_{uuid.uuid4().hex[:8]}@example.com"
        data = {
            "name": "Test Citizen",
            "email": test_email,
            "password": "testpass123",
            "phone": "9876543210",
            "role": "citizen"
        }
        success, result = self.make_request('POST', 'auth/register', data, expected_status=200)
        if success and 'token' in result and result.get('role') == 'citizen':
            self.citizen_token = result['token']
            self.log_result("Citizen Registration", True)
            return True
        else:
            self.log_result("Citizen Registration", False, result, "Citizen registration failed")
            return False

    def test_auth_me(self):
        """Test GET /api/auth/me with admin token"""
        if not self.admin_token:
            self.log_result("GET /api/auth/me", False, None, "No admin token available")
            return False
        
        success, result = self.make_request('GET', 'auth/me', token=self.admin_token)
        if success and 'user_id' in result and result.get('role') == 'admin':
            self.log_result("GET /api/auth/me", True)
            return True
        else:
            self.log_result("GET /api/auth/me", False, result, "Auth me failed or invalid response")
            return False

    def test_create_ticket(self):
        """Test POST /api/tickets"""
        if not self.citizen_token:
            self.log_result("Create Ticket", False, None, "No citizen token available")
            return False
        
        data = {
            "title": "Test Pothole Report",
            "description": "Large pothole causing traffic issues on main road",
            "category": "roads_footpaths",
            "subcategory": "Pothole",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "MG Road, Bangalore",
            "photos": []
        }
        success, result = self.make_request('POST', 'tickets', data, token=self.citizen_token, expected_status=200)
        if success and 'ticket' in result and 'ticket_id' in result['ticket']:
            self.test_ticket_id = result['ticket']['ticket_id']
            self.log_result("Create Ticket", True)
            return True
        else:
            self.log_result("Create Ticket", False, result, "Ticket creation failed")
            return False

    def test_get_tickets(self):
        """Test GET /api/tickets"""
        if not self.citizen_token:
            self.log_result("GET /api/tickets", False, None, "No citizen token available")
            return False
        
        success, result = self.make_request('GET', 'tickets', token=self.citizen_token)
        if success and 'tickets' in result and isinstance(result['tickets'], list):
            self.log_result("GET /api/tickets", True)
            return True
        else:
            self.log_result("GET /api/tickets", False, result, "Get tickets failed")
            return False

    def test_get_single_ticket(self):
        """Test GET /api/tickets/{ticket_id}"""
        if not self.test_ticket_id or not self.citizen_token:
            self.log_result("GET Single Ticket", False, None, "No ticket ID or citizen token available")
            return False
        
        success, result = self.make_request('GET', f'tickets/{self.test_ticket_id}', token=self.citizen_token)
        if success and 'ticket' in result and result['ticket']['ticket_id'] == self.test_ticket_id:
            self.log_result("GET Single Ticket", True)
            return True
        else:
            self.log_result("GET Single Ticket", False, result, "Get single ticket failed")
            return False

    def test_update_ticket_status(self):
        """Test PATCH /api/tickets/{ticket_id}/status"""
        if not self.test_ticket_id or not self.officer_token:
            self.log_result("Update Ticket Status", False, None, "No ticket ID or officer token available")
            return False
        
        data = {
            "status": "in_progress",
            "note": "Investigation started"
        }
        success, result = self.make_request('PATCH', f'tickets/{self.test_ticket_id}/status', data, token=self.officer_token)
        if success and result.get('status') == 'in_progress':
            self.log_result("Update Ticket Status", True)
            return True
        else:
            self.log_result("Update Ticket Status", False, result, "Update ticket status failed")
            return False

    def test_assign_ticket(self):
        """Test POST /api/tickets/{ticket_id}/assign"""
        if not self.test_ticket_id or not self.admin_token or not self.officer_token:
            self.log_result("Assign Ticket", False, None, "Missing required tokens or ticket ID")
            return False
        
        # Get officer user_id first
        success, officer_data = self.make_request('GET', 'auth/me', token=self.officer_token)
        if not success:
            self.log_result("Assign Ticket", False, None, "Could not get officer user_id")
            return False
        
        data = {
            "assigned_to": officer_data['user_id'],
            "note": "Assigning to ward officer"
        }
        success, result = self.make_request('POST', f'tickets/{self.test_ticket_id}/assign', data, token=self.admin_token)
        if success and 'message' in result:
            self.log_result("Assign Ticket", True)
            return True
        else:
            self.log_result("Assign Ticket", False, result, "Assign ticket failed")
            return False

    def test_send_message(self):
        """Test POST /api/tickets/{ticket_id}/messages"""
        if not self.test_ticket_id or not self.citizen_token:
            self.log_result("Send Message", False, None, "No ticket ID or citizen token available")
            return False
        
        data = {
            "text": "Thank you for looking into this issue. The pothole is getting worse."
        }
        success, result = self.make_request('POST', f'tickets/{self.test_ticket_id}/messages', data, token=self.citizen_token)
        if success and 'message_id' in result:
            self.log_result("Send Message", True)
            return True
        else:
            self.log_result("Send Message", False, result, "Send message failed")
            return False

    def test_ai_categorize(self):
        """Test POST /api/ai/categorize"""
        data = {
            "text": "There is a big pothole on the main road causing traffic problems"
        }
        success, result = self.make_request('POST', 'ai/categorize', data)
        if success and 'category' in result and 'subcategory' in result:
            self.log_result("AI Categorization", True)
            return True
        else:
            self.log_result("AI Categorization", False, result, "AI categorization failed")
            return False

    def test_public_map(self):
        """Test GET /api/map/tickets"""
        success, result = self.make_request('GET', 'map/tickets')
        if success and 'tickets' in result and isinstance(result['tickets'], list):
            self.log_result("Public Map Tickets", True)
            return True
        else:
            self.log_result("Public Map Tickets", False, result, "Public map tickets failed")
            return False

    def test_admin_dashboard(self):
        """Test GET /api/admin/dashboard"""
        if not self.admin_token:
            self.log_result("Admin Dashboard", False, None, "No admin token available")
            return False
        
        success, result = self.make_request('GET', 'admin/dashboard', token=self.admin_token)
        if success and 'total_tickets' in result and 'by_status' in result:
            self.log_result("Admin Dashboard", True)
            return True
        else:
            self.log_result("Admin Dashboard", False, result, "Admin dashboard failed")
            return False

    def test_admin_users(self):
        """Test GET /api/admin/users"""
        if not self.admin_token:
            self.log_result("Admin Users", False, None, "No admin token available")
            return False
        
        success, result = self.make_request('GET', 'admin/users', token=self.admin_token)
        if success and 'users' in result and isinstance(result['users'], list):
            self.log_result("Admin Users", True)
            return True
        else:
            self.log_result("Admin Users", False, result, "Admin users failed")
            return False

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🚀 Starting CivicConnect API Tests")
        print(f"📍 Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test categories (no auth required)
        self.test_categories()
        
        # Test authentication
        self.test_admin_login()
        self.test_officer_login()
        self.test_citizen_register()
        self.test_auth_me()
        
        # Test ticket operations
        self.test_create_ticket()
        self.test_get_tickets()
        self.test_get_single_ticket()
        self.test_update_ticket_status()
        self.test_assign_ticket()
        self.test_send_message()
        
        # Test AI and public features
        self.test_ai_categorize()
        self.test_public_map()
        
        # Test admin features
        self.test_admin_dashboard()
        self.test_admin_users()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  • {failure['test']}: {failure['error']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = CivicConnectAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())