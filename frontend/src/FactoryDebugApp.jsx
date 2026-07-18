import React from 'react';
import TuyaDeviceFlow from './components/TuyaDeviceFlow';

export default function FactoryDebugApp() {
  return (
    <div id="app-container" data-build-mode={__HEYBO_BUILD_MODE__}>
      <TuyaDeviceFlow onBack={() => {}} />
    </div>
  );
}
