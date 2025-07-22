document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURAÇÃO DO FIREBASE ---
    const firebaseConfig = {
    apiKey: "AIzaSyDMmwP7dGwwi38ZCH_zWFPCUERjb95do6U",
    authDomain: "calculadora-tvde.firebaseapp.com",
    projectId: "calculadora-tvde",
    storageBucket: "calculadora-tvde.firebasestorage.app",
    messagingSenderId: "358758507490",
    appId: "1:358758507490:web:40f8105d5ddb1438b24fbb"
    };

    // Inicializar o Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- 2. SELETORES DE ELEMENTOS HTML ---
    const tripForm = document.getElementById('trip-form');
    const userFareInput = document.getElementById('user-fare');
    const uberFeeInput = document.getElementById('uber-fee');
    const tripList = document.getElementById('trip-list');
    
    const totalUserFareEl = document.getElementById('total-user-fare');
    const totalUberFeeEl = document.getElementById('total-uber-fee');
    const averageCommissionEl = document.getElementById('average-commission');
    
    const resetButton = document.getElementById('reset-button');

    // Elementos de Autenticação
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');
    const userEmailEl = document.getElementById('user-email');

    // --- 3. ESTADO DA APLICAÇÃO ---
    let trips = [];
    let currentUser = null;

    // --- 4. FUNÇÕES DE DADOS (Firestore vs. LocalStorage) ---

    const loadTrips = async () => {
        if (currentUser) {
            // Utilizador logado: Carregar do Firestore
            try {
                const snapshot = await db.collection('trips').doc(currentUser.uid).collection('user_trips').orderBy('createdAt', 'desc').get();
                trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Erro ao carregar viagens do Firestore:", error);
                // Pode ser um erro de permissão se as regras não estiverem certas
                alert("Não foi possível carregar os seus dados da nuvem. Verifique a sua ligação ou contacte o suporte.");
                trips = [];
            }
        } else {
            // Utilizador não logado: Carregar do LocalStorage
            trips = JSON.parse(localStorage.getItem('tvde_trips')) || [];
        }
        updateUI();
    };

    const addTrip = async (trip) => {
        if (currentUser) {
            // Utilizador logado: Guardar no Firestore
            await db.collection('trips').doc(currentUser.uid).collection('user_trips').add(trip);
        } else {
            // Utilizador não logado: Guardar no LocalStorage
            // Adicionar um ID para consistência com o botão de apagar
            const tripWithId = { ...trip, id: Date.now().toString() };
            trips.push(tripWithId);
            localStorage.setItem('tvde_trips', JSON.stringify(trips));
        }
        await loadTrips();
    };
    
    const deleteTrip = async (tripId) => {
        if (!confirm('Tem a certeza que quer apagar esta viagem?')) return;

        if (currentUser) {
            await db.collection('trips').doc(currentUser.uid).collection('user_trips').doc(tripId).delete();
        } else {
            trips = trips.filter(t => t.id !== tripId);
            localStorage.setItem('tvde_trips', JSON.stringify(trips));
        }
        await loadTrips();
    };

    const resetData = async () => {
        if (!confirm('Tem a certeza que quer apagar TODOS os dados das viagens? Esta ação não pode ser desfeita.')) return;
        
        if (currentUser) {
            // Apagar todos os documentos da subcoleção no Firestore (operação em batch)
            const querySnapshot = await db.collection('trips').doc(currentUser.uid).collection('user_trips').get();
            if (querySnapshot.empty) return; // Nada a apagar
            const batch = db.batch();
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } else {
            localStorage.removeItem('tvde_trips');
        }
        trips = [];
        updateUI();
    };


    // --- 5. ATUALIZAÇÃO DA INTERFACE (UI) ---
    const updateUI = () => {
        tripList.innerHTML = '';
        trips.forEach(trip => {
            const row = document.createElement('tr');
            const commissionPercentage = trip.userFare > 0 ? (trip.uberFee / trip.userFare) * 100 : 0;
            
            row.innerHTML = `
                <td>${trip.userFare.toFixed(2)} €</td>
                <td>${trip.uberFee.toFixed(2)} €</td>
                <td>${commissionPercentage.toFixed(2)} %</td>
                <td><button class="delete-btn" data-id="${trip.id}">🗑️</button></td>
            `;

            if (trip.uberFee < 0) {
                 row.cells[1].style.color = 'var(--danger-color)';
                 row.cells[2].style.color = 'var(--danger-color)';
            }
            
            tripList.appendChild(row);
        });

        const totalUserFare = trips.reduce((sum, trip) => sum + trip.userFare, 0);
        const totalUberFee = trips.reduce((sum, trip) => sum + trip.uberFee, 0);
        const averageCommission = totalUserFare > 0 ? (totalUberFee / totalUserFare) * 100 : 0;
        
        totalUserFareEl.textContent = `${totalUserFare.toFixed(2)} €`;
        totalUberFeeEl.textContent = `${totalUberFee.toFixed(2)} €`;
        averageCommissionEl.textContent = `${averageCommission.toFixed(2)} %`;

        if (averageCommission > 25) averageCommissionEl.style.color = 'var(--danger-color)';
        else if (averageCommission > 22) averageCommissionEl.style.color = 'var(--warning-color)';
        else averageCommissionEl.style.color = 'var(--success-color)';
    };


    // --- 6. LÓGICA DE AUTENTICAÇÃO ---
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            // Utilizador está logado
            loginButton.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmailEl.textContent = user.email;
        } else {
            // Utilizador não está logado
            loginButton.style.display = 'block';
            userInfo.style.display = 'none';
            userEmailEl.textContent = '';
        }
        loadTrips(); // Carregar os dados corretos (da nuvem ou locais)
    });

    const signInWithGoogle = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Erro no login com Google:", error);
            alert(`Erro ao tentar fazer login: ${error.message}`);
        });
    };

    const signOut = () => {
        auth.signOut();
    };


    // --- 7. EVENT LISTENERS ---
    tripForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userFare = parseFloat(userFareInput.value);
        const uberFee = parseFloat(uberFeeInput.value);

        if (isNaN(userFare) || isNaN(uberFee) || userFare <= 0) {
            alert('Por favor, insira valores válidos.');
            return;
        }

        const newTrip = { 
            userFare: userFare, 
            uberFee: uberFee,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await addTrip(newTrip);
        
        userFareInput.value = '';
        uberFeeInput.value = '';
        userFareInput.focus();
    });
    
    tripList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const tripId = e.target.getAttribute('data-id');
            deleteTrip(tripId);
        }
    });

    loginButton.addEventListener('click', signInWithGoogle);
    logoutButton.addEventListener('click', signOut);
    resetButton.addEventListener('click', resetData);
});