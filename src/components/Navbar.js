import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <AppBar position="static" sx={{ mb: 3 }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Miras Yönetimi
        </Typography>
        <Box>
          <Button 
            color="inherit" 
            startIcon={<HomeIcon />}
            onClick={() => window.location.hash = '#/'}
          >
            Ana Sayfa
          </Button>
          <Button 
            color="inherit" 
            startIcon={<VerifiedUserIcon />}
            onClick={() => window.location.hash = '#/validator'}
          >
            Doğrulayıcı Paneli
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 