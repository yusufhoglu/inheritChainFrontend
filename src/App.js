import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import InheritanceManager from './components/InheritanceManager';
import ValidatorDashboard from './components/ValidatorDashboard';
import Navbar from './components/Navbar';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const router = createHashRouter([
  {
    path: "/",
    element: (
      <>
        <Navbar />
        <InheritanceManager />
      </>
    ),
  },
  {
    path: "/validator",
    element: (
      <>
        <Navbar />
        <ValidatorDashboard />
      </>
    ),
  },
]);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;