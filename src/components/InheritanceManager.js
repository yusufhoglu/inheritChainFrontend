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
  CircularProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import InheritanceManagerABI from '../artifacts/contracts/InheritanceManager.sol/InheritanceManager.json';

const InheritanceManager = () => {
    const [loading, setLoading] = useState(false);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
    const [beneficiaryAmount, setBeneficiaryAmount] = useState('');
    const [beneficiaryShare, setBeneficiaryShare] = useState('');
    const [validatorAddress, setValidatorAddress] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [hasInheritance, setHasInheritance] = useState(false);
    const [transactionPending, setTransactionPending] = useState(false);
    const [inheritanceDetails, setInheritanceDetails] = useState({
        beneficiaries: [],
        validators: [],
        requiredConfirmations: "0"
    });
    const [requiredConfirmations, setRequiredConfirmations] = useState(1);
    const [totalAmount, setTotalAmount] = useState("0");
    const [beneficiaries, setBeneficiaries] = useState([]);

    const CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // Kontrat adresinizi buraya yazın

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const initContract = async (signer) => {
        try {
            return new ethers.Contract(
                CONTRACT_ADDRESS,
                InheritanceManagerABI.abi,
                signer
            );
        } catch (error) {
            console.error("Kontrat başlatma hatası:", error);
            return null;
        }
    };

    const connectWallet = async () => {
        try {
            setLoading(true);
            console.log("Cüzdan bağlanıyor...");
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const currentAccount = accounts[0];
            setAccount(currentAccount);
            console.log("Bağlanan hesap:", currentAccount);
            
            const signer = provider.getSigner();
            const contractInstance = await initContract(signer);
            
            setContract(contractInstance);
            console.log("Kontrat bağlantısı kuruldu");
            
            await checkInheritance(contractInstance, currentAccount);
        } catch (error) {
            console.error("Bağlantı hatası:", error);
            showSnackbar('Bağlantı hatası: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const checkInheritance = async (contractInstance, currentAccount) => {
        try {
            const contractToUse = contractInstance || contract;
            const accountToUse = currentAccount || account;
            
            if (!contractToUse || !accountToUse) {
                console.log("Kontrat veya hesap bulunamadı");
                setHasInheritance(false);
                return;
            }

            console.log("Miras planı kontrolü yapılıyor...");
            console.log("Kontrat adresi:", contractToUse.address);
            console.log("Hesap:", accountToUse);
            
            // Önce try-catch ile kontrol edelim
            try {
                // Direkt kontrat çağrısı yapalım
                const tx = await contractToUse.callStatic.createInheritance();
                console.log("Miras planı yok");
                setHasInheritance(false);
            } catch (error) {
                if (error.message.includes('Inheritance already exists')) {
                    console.log("Miras planı var");
                    setHasInheritance(true);
                    
                    // Detayları getir
                    const validatorCount = await contractToUse.getValidatorCount(accountToUse);
                    console.log("Doğrulayıcı sayısı:", validatorCount.toString());
                    
                    let validators = [];
                    for(let i = 0; i < validatorCount; i++) {
                        const validatorAddress = await contractToUse.getValidator(accountToUse, i);
                        const hasConfirmed = await contractToUse.getValidatorConfirmation(accountToUse, i);
                        validators.push({
                            address: validatorAddress,
                            hasConfirmed
                        });
                    }
                    
                    const beneficiaryCount = await contractToUse.getBeneficiaryCount(accountToUse);
                    let beneficiaries = [];
                    for(let i = 0; i < beneficiaryCount; i++) {
                        const [address, share] = await contractToUse.getBeneficiary(accountToUse, i);
                        beneficiaries.push({
                            address,
                            share: share.toString()
                        });
                    }
                    
                    setInheritanceDetails({
                        beneficiaries,
                        validators,
                        requiredConfirmations: validatorCount.toString()
                    });
                } else {
                    console.log("Miras planı yok");
                    setHasInheritance(false);
                }
            }
        } catch (error) {
            console.error("Miras planı kontrolünde hata:", error);
            setHasInheritance(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                try {
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const accounts = await provider.send("eth_requestAccounts", []);
                    const currentAccount = accounts[0];
                    setAccount(currentAccount);
                    
                    const signer = provider.getSigner();
                    const contractInstance = await initContract(signer);
                    if (contractInstance) {
                        setContract(contractInstance);
                        await checkInheritance(contractInstance, currentAccount);
                    }
                } catch (error) {
                    console.error("Başlangıç hatası:", error);
                    showSnackbar('Bağlantı hatası: ' + error.message, 'error');
                }
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = async (accounts) => {
                try {
                    const newAccount = accounts[0];
                    console.log("Hesap değişti:", newAccount);
                    setAccount(newAccount);
                    
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const signer = provider.getSigner();
                    
                    // Yeni kontrat instance'ı oluştur
                    const contractInstance = await initContract(signer);
                    if (contractInstance) {
                        setContract(contractInstance);
                        // State'leri sıfırla
                        setHasInheritance(false);
                        setInheritanceDetails({
                            beneficiaries: [],
                            validators: [],
                            requiredConfirmations: "0"
                        });
                        // Yeni hesap için miras planını kontrol et
                        await checkInheritance(contractInstance, newAccount);
                    }
                } catch (error) {
                    console.error("Hesap değişikliği hatası:", error);
                    showSnackbar('Hesap değişikliği hatası: ' + error.message, 'error');
                }
            };

            const handleChainChanged = () => {
                // Sayfa yenilemek yerine state'leri sıfırlayalım
                setContract(null);
                setAccount(null);
                setHasInheritance(false);
                setInheritanceDetails({
                    beneficiaries: [],
                    validators: [],
                    requiredConfirmations: "0"
                });
                // Yeniden başlat
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []); // Dependency array'i boş bırakalım

    useEffect(() => {
        const checkStatus = async () => {
            if (contract && account) {
                await checkInheritance();
            }
        };
        checkStatus();
    }, [contract, account]);

    const createInheritance = async () => {
        try {
            if (!contract || !account) {
                showSnackbar('Lütfen önce cüzdanınızı bağlayın!', 'warning');
                return;
            }

            setLoading(true);
            console.log("Miras planı oluşturuluyor...");
            console.log("Gönderen hesap:", account);
            
            // Gas limitini artıralım
            const tx = await contract.createInheritance({
                from: account,
                gasLimit: 500000
            });
            
            console.log("İşlem gönderildi:", tx.hash);
            showSnackbar('Miras planı oluşturuluyor...', 'info');
            
            // Transaction receipt'i bekleyelim
            const receipt = await tx.wait();
            console.log("İşlem receipt:", receipt);
            
            if (receipt.status === 1) {
                console.log("İşlem başarılı");
                
                // Kısa bir gecikme ekleyelim
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Miras planını kontrol edelim
                await checkInheritance();
                showSnackbar('Miras planı başarıyla oluşturuldu!', 'success');
            } else {
                console.error("İşlem başarısız");
                showSnackbar('Miras planı oluşturulamadı!', 'error');
            }
        } catch (error) {
            console.error("Miras planı oluşturma hatası:", error);
            if (error.message.includes('Inheritance already exists')) {
                showSnackbar('Zaten aktif bir miras planınız var!', 'error');
                await checkInheritance();
            } else {
                showSnackbar('Miras planı oluşturulamadı: ' + error.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Miras miktarını artırmak için yeni fonksiyon
    const addToInheritance = async () => {
        try {
            setLoading(true);
            const amount = ethers.utils.parseEther("1.0"); // Örnek: 1 ETH
            const tx = await contract.addToInheritance({ value: amount });
            await tx.wait();
            showSnackbar('Miras miktarı artırıldı', 'success');
            await fetchInheritanceDetails();
        } catch (error) {
            console.error("Miras artırma hatası:", error);
            showSnackbar('Miras miktarı artırılamadı: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const addBeneficiary = async () => {
        try {
            setLoading(true);
            
            // Input kontrolü
            if (!beneficiaryAddress || !beneficiaryAmount) {
                throw new Error('Tüm alanları doldurun');
            }

            // Amount değerini ETH'den Wei'ye çevirelim
            const amountInWei = ethers.utils.parseEther(beneficiaryAmount.toString());
            console.log('Gönderilecek miktar (Wei):', amountInWei.toString());
            
            const tx = await contract.addBeneficiary(
                beneficiaryAddress,
                amountInWei,
                {
                    value: amountInWei, // ETH'yi direkt gönderiyoruz
                    gasLimit: 300000
                }
            );
            
            showSnackbar('İşlem gönderiliyor...', 'info');
            await tx.wait();
            
            // Yeni varisi listeye ekle
            setBeneficiaries([...beneficiaries, {
                address: beneficiaryAddress,
                amount: beneficiaryAmount
            }]);
            
            // Toplam miktarı güncelle
            const newTotal = ethers.utils.formatEther(
                ethers.utils.parseEther(totalAmount).add(amountInWei)
            );
            setTotalAmount(newTotal);
            
            showSnackbar('Varis başarıyla eklendi ve ETH gönderildi', 'success');
            
            // Form alanlarını temizle
            setBeneficiaryAddress('');
            setBeneficiaryAmount('');
            
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
            console.log("Doğrulayıcı ekleniyor:", validatorAddress);
            console.log("Gönderen hesap:", account);
            
            const tx = await contract.addValidator(validatorAddress, {
                gasLimit: 200000 // Manuel gas limit ekleyelim
            });
            
            showSnackbar('Doğrulayıcı ekleniyor...', 'info');
            
            console.log("İşlem gönderildi:", tx.hash);
            await tx.wait();
            console.log("İşlem onaylandı");
            
            // Form alanını temizle
            setValidatorAddress('');
            
            // Kısa bir gecikme ekleyelim
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Detayları güncelle
            await checkInheritance();
            
            showSnackbar('Doğrulayıcı başarıyla eklendi!', 'success');
        } catch (error) {
            console.error("Doğrulayıcı ekleme hatası:", error);
            if (error.message.includes('Inheritance not created')) {
                showSnackbar('Önce miras planı oluşturmalısınız!', 'error');
                setHasInheritance(false);
            } else {
                showSnackbar('Doğrulayıcı eklenemedi: ' + error.message, 'error');
            }
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

    const sendInheritanceAmount = async () => {
        try {
            setLoading(true);
            
            // Toplam miktarı Wei'ye çevirelim
            const amountInWei = ethers.utils.parseEther(totalAmount);
            console.log('Gönderilecek toplam miktar (Wei):', amountInWei.toString());
            
            const tx = await contract.sendInheritanceAmount({
                value: amountInWei,
                gasLimit: 300000
            });
            
            showSnackbar('İşlem gönderiliyor...', 'info');
            
            await tx.wait();
            showSnackbar('Miras miktarı başarıyla gönderildi', 'success');
            
            // İşlem başarılı olduktan sonra state'i güncelleyelim
            await fetchInheritanceDetails();
            
        } catch (error) {
            console.error("Miras gönderme hatası:", error);
            showSnackbar('Miras gönderilemedi: ' + error.message, 'error');
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
                                                label="Miras Miktarı (ETH)"
                                                value={beneficiaryAmount}
                                                onChange={(e) => setBeneficiaryAmount(e.target.value)}
                                                type="number"
                                                inputProps={{ min: "0", step: "0.000000000000000001" }}
                                                fullWidth
                                                margin="normal"
                                                helperText="ETH cinsinden miktar girin"
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

                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardContent>
                                            <Button 
                                                variant="contained" 
                                                color="secondary" 
                                                onClick={addToInheritance}
                                                disabled={loading || !hasInheritance}
                                            >
                                                Miras Miktarını Artır (1 ETH)
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {beneficiaries.length > 0 && (
                                    <>
                                        <Grid item xs={12}>
                                            <Card>
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>
                                                        Toplam Miras Miktarı: {totalAmount} ETH
                                                    </Typography>
                                                    
                                                    <List>
                                                        {beneficiaries.map((beneficiary, index) => (
                                                            <ListItem key={index}>
                                                                <ListItemText
                                                                    primary={`Adres: ${beneficiary.address}`}
                                                                    secondary={`Miras Miktarı: ${beneficiary.amount} ETH`}
                                                                />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                </CardContent>
                                            </Card>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Card>
                                                <CardContent>
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        onClick={sendInheritanceAmount}
                                                        disabled={loading}
                                                        sx={{ mt: 2 }}
                                                    >
                                                        Miras Miktarını Gönder ({totalAmount} ETH)
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </>
                                )}
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