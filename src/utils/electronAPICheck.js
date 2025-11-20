// Utility to check if electronAPI is available
export function checkElectronAPI() {
  if (typeof window === 'undefined') {
    console.error('Window object not available');
    return false;
  }

  if (!window.electronAPI) {
    console.error('electronAPI not found on window object');
    console.log('Available window properties:', Object.keys(window).filter(k => k.includes('electron')));
    return false;
  }

  if (typeof window.electronAPI !== 'object') {
    console.error('electronAPI is not an object, it is:', typeof window.electronAPI);
    return false;
  }

  console.log('electronAPI is available with methods:', Object.keys(window.electronAPI));
  return true;
}

// Call this immediately to debug
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('=== Electron API Check ===');
    checkElectronAPI();
  }, 100);
}
