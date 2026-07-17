/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CameraView } from './components/CameraView';
import { DashboardView } from './components/DashboardView';
import { Layout } from './components/Layout';
import { MistakesView } from './components/MistakesView';
import { PracticeView } from './components/PracticeView';
import { ViewState } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('home');

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <DashboardView onChangeView={setCurrentView} />;
      case 'practice':
        return <PracticeView onCompleteSet={() => setCurrentView('home')} />;
      case 'camera':
        return <CameraView />;
      case 'mistakes':
        return <MistakesView />;
      default:
        return <DashboardView onChangeView={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderView()}
    </Layout>
  );
}
