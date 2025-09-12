import React, { useState } from 'react';
import sentry from '../../utils/sentry';
import sentryEnhancer from '../../utils/sentryEnhancer';
import { useSentry } from '../../hooks/useSentry';

const SentryTest: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const { setUser, setTag, addBreadcrumb } = useSentry();

  const handleTestError = () => {
    try {
      throw new Error('Test error from SentryTest component');
    } catch (error) {
      sentry.captureException(error);
      setErrorMessage('Error sent to Sentry: ' + (error as Error).message);
    }
  };

  const handleTestMessage = () => {
    sentry.captureMessage('Test message from SentryTest component', 'info');
    setErrorMessage('Test message sent to Sentry');
  };

  const handleConsoleError = () => {
    console.error('Test console error from SentryTest component');
    setErrorMessage('Console error logged (should be captured by Sentry)');
  };

  const handleUnhandledError = () => {
    setTimeout(() => {
      throw new Error('Unhandled test error from SentryTest component');
    }, 100);
    setErrorMessage('Unhandled error thrown (should be captured by Sentry)');
  };

  const handlePromiseRejection = () => {
    Promise.reject(new Error('Test promise rejection from SentryTest component'));
    setErrorMessage('Promise rejection triggered (should be captured by Sentry)');
  };

  const handleTestEnhancedFeatures = () => {
    // Set user context
    setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin'
    });

    // Add custom tags
    setTag('test-scenario', 'enhanced-features');
    setTag('component', 'SentryTest');

    // Track user action
    sentryEnhancer.trackUserAction('button-click', 'enhanced-features-test');

    // Track feature usage
    sentryEnhancer.trackFeatureUsage('sentry-test', 'enhanced-features', {
      testType: 'comprehensive',
      userId: 'test-user-123'
    });

    // Add custom breadcrumb
    addBreadcrumb({
      message: 'Enhanced features test executed',
      category: 'test',
      level: 'info',
      data: { testType: 'enhanced', timestamp: Date.now() }
    });

    setErrorMessage('Enhanced features test completed - check Sentry dashboard for rich context data');
  };

  const handleTestApiCall = () => {
    // Simulate API call tracking
    sentryEnhancer.trackApiCall('POST', '/api/test', 200, 150);
    sentryEnhancer.trackApiCall('GET', '/api/users', 404, 2000);
    
    setErrorMessage('API call tracking test completed');
  };

  const handleTestNavigation = () => {
    sentryEnhancer.trackNavigation('/dashboard', '/test-page');
    setErrorMessage('Navigation tracking test completed');
  };

  const clearMessage = () => {
    setErrorMessage('');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Sentry Test Component</h3>
      <p>Use these buttons to test Sentry error reporting and Frontend Insights:</p>
      
      <div style={{ marginBottom: '10px' }}>
        <h4>Basic Error Tests:</h4>
        <button onClick={handleTestError} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test Caught Exception
        </button>
        <button onClick={handleTestMessage} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test Message
        </button>
        <button onClick={handleConsoleError} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test Console Error
        </button>
        <button onClick={handleUnhandledError} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test Unhandled Error
        </button>
        <button onClick={handlePromiseRejection} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test Promise Rejection
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <h4>Frontend Insights Tests:</h4>
        <button onClick={handleTestEnhancedFeatures} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test Enhanced Features
        </button>
        <button onClick={handleTestApiCall} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test API Call Tracking
        </button>
        <button onClick={handleTestNavigation} style={{ marginRight: '10px', marginBottom: '5px' }}>
          Test Navigation Tracking
        </button>
        <button onClick={clearMessage} style={{ marginBottom: '5px' }}>
          Clear
        </button>
      </div>

      {errorMessage && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f0f8ff', 
          border: '1px solid #0066cc',
          marginTop: '10px'
        }}>
          <strong>Status:</strong> {errorMessage}
        </div>
      )}
    </div>
  );
};

export default SentryTest;
