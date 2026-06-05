import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SnakeGame from './SnakeGame';
import AdminPage from './AdminPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<SnakeGame />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  );
}

export default App;
