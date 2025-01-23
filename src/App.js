import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import InheritanceManager from './components/InheritanceManager';

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <InheritanceManager />
    </ThemeProvider>
  );
}

export default App;