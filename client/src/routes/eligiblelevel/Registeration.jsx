import React from 'react';

const styles = {
  container: {
    maxWidth: '400px',
    margin: '0 auto',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0
  },
  button: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    outline: 'none'
  },
  '@media (hover: hover)': {
    button: {
      '&:hover': {
        backgroundColor: '#1557b0'
      }
    }
  }
};

const DesignChallengeRegistration = () => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Design Challenge</h1>
        <p style={styles.subtitle}>Design Challenge</p>
        <button 
          style={styles.button}
          onClick={() => console.log('Registration clicked')}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1557b0'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#1a73e8'}
          onFocus={(e) => e.target.style.backgroundColor = '#1557b0'}
          onBlur={(e) => e.target.style.backgroundColor = '#1a73e8'}
        >
          Register
        </button>
      </div>
    </div>
  );
};

export default DesignChallengeRegistration;