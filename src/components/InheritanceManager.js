import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import InheritanceManagerABI from '../artifacts/contracts/InheritanceManager.sol/InheritanceManager.json';

const InheritanceManager = () => {
    const [account, setAccount] = useState(null);
    const [contract, setContract] = useState(null);
    const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
    const [beneficiaryShare, setBeneficiaryShare] = useState('');
    const [validatorAddress, setValidatorAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [hasInheritance, setHasInheritance] = useState(false);
    const [transactionPending, setTransactionPending] = useState(false);
    const [inheritanceDetails, setInheritanceDetails] = useState({
        beneficiaries: [],
        validators: [],
        requiredConfirmations: 0
    });

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                setLoading(true);
                
                // Doğru chain ID'ye geçiş yap
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x539' }], // 1337 decimal = 0x539 hex
                    });
                } catch (switchError) {
                    // Ağ bulunamadıysa ekle
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x539',
                                chainName: 'Localhost 8545',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['http://127.0.0.1:8545']
                            }]
                        });
                    }
                }
                
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
                
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const signer = provider.getSigner();
                
                const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Deploy edilen kontrat adresi
                const contractInstance = new ethers.Contract(
                    contractAddress,
                    InheritanceManagerABI.abi,
                    signer
                );
                
                setContract(contractInstance);
                showSnackbar('Cüzdan başarıyla bağlandı!');
                await checkInheritance();
            } catch (error) {
                console.error("Bağlantı hatası:", error);
                showSnackbar('Cüzdan bağlantısında hata: ' + error.message, 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const checkInheritance = async () => {
        try {
            if (contract && account) {
                const inheritance = await contract.inheritances(account);
                console.log("Miras durumu:", inheritance);
                setHasInheritance(inheritance.isActive);
            }
        } catch (error) {
            console.error("Miras planı kontrolünde hata:", error);
            showSnackbar('Miras planı kontrolünde hata oluştu', 'error');
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                setAccount(accounts[0]);
                checkInheritance();
            });
        }
        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {});
            }
        };
    }, []);

    const createInheritance = async () => {
        if (transactionPending) return;
        
        try {
            setTransactionPending(true);
            setLoading(true);
            
            console.log("Miras planı oluşturuluyor...");
            const tx = await contract.createInheritance(2);
            console.log("İşlem gönderildi:", tx.hash);
            
            showSnackbar('İşlem gönderildi, onay bekleniyor...', 'info');
            
            await tx.wait();
            console.log("İşlem onaylandı");
            
            await checkInheritance();
            
            showSnackbar('Miras planı başarıyla oluşturuldu!', 'success');
        } catch (error) {
            console.error("Miras planı oluşturma hatası:", error);
            showSnackbar('Miras planı oluşturulamadı: ' + (error.message || 'Bilinmeyen hata'), 'error');
        } finally {
            setLoading(false);
            setTransactionPending(false);
        }
    };

    const addBeneficiary = async () => {
        try {
            if (!hasInheritance) {
                showSnackbar('Önce miras planı oluşturmalısınız!', 'warning');
                return;
            }
            
            if (!beneficiaryAddress || !beneficiaryShare) {
                showSnackbar('Lütfen tüm alanları doldurun!', 'warning');
                return;
            }

            setLoading(true);
            const tx = await contract.addBeneficiary(beneficiaryAddress, beneficiaryShare, {
                gasLimit: 1000000
            });
            showSnackbar('Varis ekleniyor...', 'info');
            
            await tx.wait();
            showSnackbar('Varis başarıyla eklendi!', 'success');
            
            // Form alanlarını temizle
            setBeneficiaryAddress('');
            setBeneficiaryShare('');
            
            // Detayları güncelle
            await fetchInheritanceDetails();
            
        } catch (error) {
            console.error("Varis ekleme hatası:", error);
            showSnackbar('Varis eklenemedi: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const addValidator = async () => {
        try {
            if (!hasInheritance) {
                showSnackbar('Önce miras planı oluşturmalısınız!', 'warning');
                return;
            }

            if (!validatorAddress) {
                showSnackbar('Lütfen doğrulayıcı adresini girin!', 'warning');
                return;
            }

            setLoading(true);
            const tx = await contract.addValidator(validatorAddress, {
                gasLimit: 1000000
            });
            showSnackbar('Doğrulayıcı ekleniyor...', 'info');
            
            await tx.wait();
            showSnackbar('Doğrulayıcı başarıyla eklendi!', 'success');
            
            // Form alanını temizle
            setValidatorAddress('');
            
            // Detayları güncelle
            await fetchInheritanceDetails();
            
        } catch (error) {
            console.error("Doğrulayıcı ekleme hatası:", error);
            showSnackbar('Doğrulayıcı eklenemedi: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchInheritanceDetails = async () => {
        try {
            if (contract && account) {
                console.log("Detaylar getiriliyor...");
                const inheritance = await contract.inheritances(account);
                
                // Varisleri al
                const beneficiaryCount = await contract.getBeneficiaryCount(account);
                console.log("Varis sayısı:", beneficiaryCount.toString());
                
                let beneficiaries = [];
                for(let i = 0; i < beneficiaryCount; i++) {
                    const [address, share] = await contract.getBeneficiary(account, i);
                    beneficiaries.push({
                        address,
                        share: share.toString()
                    });
                }

                // Doğrulayıcıları al
                const validatorCount = await contract.getValidatorCount(account);
                console.log("Doğrulayıcı sayısı:", validatorCount.toString());
                
                let validators = [];
                for(let i = 0; i < validatorCount; i++) {
                    const validatorAddress = await contract.getValidator(account, i);
                    const hasConfirmed = await contract.getValidatorConfirmation(account, i);
                    validators.push({
                        address: validatorAddress,
                        hasConfirmed
                    });
                }

                setInheritanceDetails({
                    beneficiaries,
                    validators,
                    requiredConfirmations: inheritance.requiredConfirmations.toString()
                });
                
                console.log("Detaylar güncellendi:", {
                    beneficiaries,
                    validators,
                    requiredConfirmations: inheritance.requiredConfirmations.toString()
                });
            }
        } catch (error) {
            console.error("Detayları getirme hatası:", error);
            showSnackbar('Miras planı detayları alınamadı', 'error');
        }
    };

    useEffect(() => {
        if (hasInheritance) {
            fetchInheritanceDetails();
        }
    }, [hasInheritance, contract, account]);

    const cancelInheritance = async () => {
        try {
            setLoading(true);
            const tx = await contract.cancelInheritance({
                gasLimit: 1000000
            });
            showSnackbar('Miras planı iptal ediliyor...', 'info');
            await tx.wait();
            await checkInheritance();
            setInheritanceDetails({
                beneficiaries: [],
                validators: [],
                requiredConfirmations: 0
            });
            showSnackbar('Miras planı başarıyla iptal edildi!', 'success');
        } catch (error) {
            console.error("İptal hatası:", error);
            showSnackbar('Miras planı iptal edilemedi: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" sx={{ marginBottom: 4 }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Ethereum Miras Yönetim Sistemi
                    </Typography>
                    {account && (
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            {account.slice(0, 6)}...{account.slice(-4)}
                        </Typography>
                    )}
                </Toolbar>
            </AppBar>

            <Container maxWidth="md">
                {!account ? (
                    <Card sx={{ textAlign: 'center', padding: 4 }}>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                Hoş Geldiniz
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AccountBalanceWalletIcon />}
                                onClick={connectWallet}
                                disabled={loading}
                                sx={{ mt: 2 }}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Cüzdana Bağlan'}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Grid container spacing={4}>
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6">
                                            Miras Planı Durumu
                                        </Typography>
                                        {hasInheritance && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={cancelInheritance}
                                                disabled={loading}
                                                startIcon={loading ? <CircularProgress size={20} /> : null}
                                            >
                                                Miras Planını İptal Et
                                            </Button>
                                        )}
                                    </Box>

                                    {hasInheritance ? (
                                        <Alert severity="success">
                                            Miras planınız aktif durumda
                                        </Alert>
                                    ) : (
                                        <>
                                            <Alert severity="info" sx={{ mb: 2 }}>
                                                Henüz bir miras planınız bulunmuyor
                                            </Alert>
                                            <Button
                                                variant="contained"
                                                onClick={createInheritance}
                                                disabled={loading}
                                                fullWidth
                                            >
                                                {loading ? <CircularProgress size={24} /> : 'Yeni Miras Planı Oluştur'}
                                            </Button>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {hasInheritance && (
                            <>
                                <Grid item xs={12}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Miras Planı Detayları
                                            </Typography>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Gerekli Onay Sayısı: {inheritanceDetails.requiredConfirmations}
                                            </Typography>

                                            <Box sx={{ mt: 3 }}>
                                                <Typography variant="h6" gutterBottom>
                                                    Varisler
                                                </Typography>
                                                {inheritanceDetails.beneficiaries.length > 0 ? (
                                                    inheritanceDetails.beneficiaries.map((beneficiary, index) => (
                                                        <Box key={index} sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                                                            <Typography variant="body2">
                                                                Adres: {beneficiary.address}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                Pay: %{(beneficiary.share / 100).toFixed(2)}
                                                            </Typography>
                                                        </Box>
                                                    ))
                                                ) : (
                                                    <Alert severity="info">Henüz varis eklenmemiş</Alert>
                                                )}
                                            </Box>

                                            <Box sx={{ mt: 3 }}>
                                                <Typography variant="h6" gutterBottom>
                                                    Doğrulayıcılar
                                                </Typography>
                                                {inheritanceDetails.validators.length > 0 ? (
                                                    inheritanceDetails.validators.map((validator, index) => (
                                                        <Box key={index} sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                                                            <Typography variant="body2">
                                                                Adres: {validator.address}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                Durum: {validator.hasConfirmed ? 'Onayladı' : 'Henüz Onaylamadı'}
                                                            </Typography>
                                                        </Box>
                                                    ))
                                                ) : (
                                                    <Alert severity="info">Henüz doğrulayıcı eklenmemiş</Alert>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Varis Ekle
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                label="Varis Adresi"
                                                value={beneficiaryAddress}
                                                onChange={(e) => setBeneficiaryAddress(e.target.value)}
                                                margin="normal"
                                            />
                                            <TextField
                                                fullWidth
                                                label="Pay (100 = %1)"
                                                type="number"
                                                value={beneficiaryShare}
                                                onChange={(e) => setBeneficiaryShare(e.target.value)}
                                                margin="normal"
                                            />
                                            <Button
                                                variant="contained"
                                                startIcon={<PersonAddIcon />}
                                                onClick={addBeneficiary}
                                                disabled={loading}
                                                fullWidth
                                                sx={{ mt: 2 }}
                                            >
                                                {loading ? <CircularProgress size={24} /> : 'Varis Ekle'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Doğrulayıcı Ekle
                                            </Typography>
                                            <TextField
                                                fullWidth
                                                label="Doğrulayıcı Adresi"
                                                value={validatorAddress}
                                                onChange={(e) => setValidatorAddress(e.target.value)}
                                                margin="normal"
                                            />
                                            <Button
                                                variant="contained"
                                                startIcon={<VerifiedUserIcon />}
                                                onClick={addValidator}
                                                disabled={loading}
                                                fullWidth
                                                sx={{ mt: 2 }}
                                            >
                                                {loading ? <CircularProgress size={24} /> : 'Doğrulayıcı Ekle'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </>
                        )}
                    </Grid>
                )}
            </Container>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default InheritanceManager; 