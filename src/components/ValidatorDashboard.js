import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip
} from '@mui/material';
import InheritanceManagerABI from '../artifacts/contracts/InheritanceManager.sol/InheritanceManager.json';

const ValidatorDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [validations, setValidations] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // Kontrat adresinizi buraya yazın

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const currentAccount = accounts[0];
      setAccount(currentAccount);

      const signer = provider.getSigner();
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        InheritanceManagerABI.abi,
        signer
      );
      setContract(contractInstance);

      await fetchValidations(contractInstance, currentAccount);
    } catch (error) {
      console.error("Bağlantı hatası:", error);
      showSnackbar('Bağlantı hatası: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchValidations = async (contractInstance, currentAccount) => {
    try {
      setLoading(true);
      const validatorOf = await contractInstance.getValidatorInheritances(currentAccount);
      
      const validationPromises = validatorOf.map(async (ownerAddress) => {
        const [isActive, isDead, confirmationCount, requiredConfirmations, distributed] = 
          await contractInstance.getInheritanceStatus(ownerAddress);
        const validatorIndex = await contractInstance.getValidatorIndex(ownerAddress, currentAccount);
        const hasConfirmed = await contractInstance.getValidatorConfirmation(ownerAddress, validatorIndex);
        
        return {
          owner: ownerAddress,
          isActive,
          isDead,
          hasConfirmed,
          confirmationCount: confirmationCount.toString(),
          requiredConfirmations: requiredConfirmations.toString(),
          distributed
        };
      });

      const validationResults = await Promise.all(validationPromises);
      setValidations(validationResults);
    } catch (error) {
      console.error("Doğrulama listesi alınamadı:", error);
      showSnackbar('Doğrulama listesi alınamadı: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeath = async (ownerAddress) => {
    try {
      setLoading(true);
      console.log("Ölüm onayı gönderiliyor...", ownerAddress);
      
      // Kontrat bakiyesini kontrol et
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(contract.address);
      console.log("Kontrat bakiyesi:", ethers.utils.formatEther(balance));

      // Gas tahmini al
      const gasEstimate = await contract.estimateGas.confirmDeath(ownerAddress);
      console.log("Tahmini gas:", gasEstimate.toString());

      const tx = await contract.confirmDeath(ownerAddress, {
        gasLimit: gasEstimate.mul(120).div(100), // %20 extra gas limiti
      });
      
      showSnackbar('İşlem gönderiliyor...', 'info');
      console.log("Transaction hash:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      
      await fetchValidations(contract, account);
      showSnackbar('Ölüm onayı başarıyla gönderildi', 'success');
    } catch (error) {
      console.error("Ölüm onayı hatası:", error);
      // Daha detaylı hata mesajı
      let errorMessage = error.message;
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
      showSnackbar('Ölüm onayı gönderilemedi: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
    }
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Doğrulayıcı Paneli
      </Typography>

      {!account ? (
        <Button
          variant="contained"
          color="primary"
          onClick={connectWallet}
          disabled={loading}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : 'Cüzdanı Bağla'}
        </Button>
      ) : (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Bağlı Hesap: {account}
          </Typography>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Doğrulayıcısı Olduğunuz Miras Planları
              </Typography>

              {loading ? (
                <Grid container justifyContent="center">
                  <CircularProgress />
                </Grid>
              ) : validations.length === 0 ? (
                <Typography>
                  Henüz doğrulayıcısı olduğunuz bir miras planı bulunmuyor.
                </Typography>
              ) : (
                <List>
                  {validations.map((validation, index) => (
                    <React.Fragment key={validation.owner}>
                      {index > 0 && <Divider />}
                      <ListItem>
                        <ListItemText
                          primary={`Miras Sahibi: ${validation.owner}`}
                          secondary={
                            <>
                              <Typography component="span" variant="body2">
                                Durum: {validation.isDead ? 'Ölüm Onaylandı' : 'Aktif'}
                                <br />
                                Onay Durumu: {validation.confirmationCount} / {validation.requiredConfirmations}
                                <br />
                                Miras Durumu: {validation.distributed ? 'Dağıtıldı' : 'Dağıtılmadı'}
                              </Typography>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          {!validation.isDead && !validation.hasConfirmed && (
                            <Button
                              variant="contained"
                              color="secondary"
                              onClick={() => confirmDeath(validation.owner)}
                              disabled={loading}
                            >
                              Ölümü Onayla
                            </Button>
                          )}
                          {validation.hasConfirmed && (
                            <Chip label="Onaylandı" color="success" />
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ValidatorDashboard; 