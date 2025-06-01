'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestSignupPage() {
  const [result, setResult] = useState<string>('');
  const { user } = useAuth();

  const testDepartmentSignup = async () => {
    try {
      setResult('Testing department-based signup flow...');
      
      // Test data
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'testpassword123';
      const testName = 'Test Department User';
      const testDepartmentId = 'test-dept-id'; // This would be a real department ID
      
      setResult(`Test user would be created with:
        Email: ${testEmail}
        Name: ${testName}
        Department: ${testDepartmentId}
        Expected Role: MANAGER (auto-assigned)
        Expected Redirect: /admin/dashboard/${testDepartmentId}
      `);
      
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Department Signup Flow Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Current User Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify({
                id: user?.id,
                email: user?.email,
                role: user?.role,
                departmentId: user?.departmentId,
                hasAdminAccess: !!user?.departmentId || ['admin', 'super_admin'].includes(user?.role || '')
              }, null, 2)}
            </pre>
          </div>
          
          <Button onClick={testDepartmentSignup}>
            Test Department Signup Flow
          </Button>
          
          {result && (
            <div>
              <h3 className="font-semibold">Test Result:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Expected Flow:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>User visits /register</li>
              <li>User fills form and optionally selects a department</li>
              <li>If department selected: User gets MANAGER role automatically</li>
              <li>If no department: User gets END_USER role</li>
              <li>After signup, user is redirected to:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Department admin dashboard if they have a department</li>
                  <li>Regular dashboard if they don't have a department</li>
                </ul>
              </li>
              <li>Navigation shows admin options for users with departments</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 