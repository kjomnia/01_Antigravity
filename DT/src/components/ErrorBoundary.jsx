import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', margin: '20px', color: '#b91c1c' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Something went wrong.</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }} open>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details (Click to expand)</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button
                            onClick={() => {
                                if (confirm('모든 데이터를 초기화하고 새로고침 하시겠습니까? (이 작업은 되돌릴 수 없습니다.)')) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            style={{
                                backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            데이터 초기화 및 복구 (Clear Data & Fix)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
