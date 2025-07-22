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

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- 2. SELETORES DE ELEMENTOS HTML ---
    // Formulário
    const tripForm = document.getElementById('trip-form');
    const userFareInput = document.getElementById('user-fare');
    const uberFeeInput = document.getElementById('uber-fee');
    const tripDateInput = document.getElementById('trip-date');

    // Resumo e Lista
    const tripList = document.getElementById('trip-list');
    const totalUserFareEl = document.getElementById('total-user-fare');
    const totalUberFeeEl = document.getElementById('total-uber-fee');
    const averageCommissionEl = document.getElementById('average-commission');
    const resetButton = document.getElementById('reset-button');
    const summaryPeriodLabel = document.getElementById('summary-period-label');

    // Autenticação
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');
    const userEmailEl = document.getElementById('user-email');

    // Funcionalidades Premium (Filtros e Gráfico)
    const premiumFeatures = document.getElementById('premium-features');
    const dateFilter = document.getElementById('date-filter');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const chartCanvas = document.getElementById('earnings-chart');

    // --- 3. ESTADO DA APLICAÇÃO ---
    let allTrips = []; // Guarda todas as viagens do utilizador
    let filteredTrips = []; // Guarda as viagens após aplicar o filtro
    let currentUser = null;
    let earningsChart = null;

    // --- 4. FUNÇÕES DE DADOS (Firestore & Lógica de Filtros) ---

    const getDatesForFilter = (filterValue) => {
        const now = new Date();
        let start, end;
        
        switch(filterValue) {
            case 'this-month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'last-month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case 'custom':
                 start = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
                 end = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;
                 break;
            default: // 'all'
                start = null;
                end = null;
        }
        return { start, end };
    };

    const loadTrips = async () => {
        if (!currentUser) {
            // Se não está logado, não carrega nada da nuvem
            allTrips = [];
            filteredTrips = [];
            updateUI();
            return;
        }

        // Carrega todas as viagens do utilizador do Firestore uma vez
        const snapshot = await db.collection('trips').doc(currentUser.uid).collection('user_trips').orderBy('tripDate', 'desc').get();
        allTrips = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Converte Timestamp do Firebase para Date do JS
                tripDate: data.tripDate.toDate() 
            };
        });
        
        applyFilters();
    };

    const applyFilters = () => {
        const filterValue = dateFilter.value;
        const { start, end } = getDatesForFilter(filterValue);
        
        if (start && end) {
            filteredTrips = allTrips.filter(trip => trip.tripDate >= start && trip.tripDate <= end);
        } else {
            filteredTrips = allTrips; // Sem filtro de data
        }
        
        const selectedOption = dateFilter.options[dateFilter.selectedIndex];
        summaryPeriodLabel.textContent = `(${selectedOption.text})`;
        updateUI();
    };

    const addTrip = async (trip) => {
        if (!currentUser) {
            alert("Faça login para adicionar viagens.");
            return;
        }
        await db.collection('trips').doc(currentUser.uid).collection('user_trips').add(trip);
        await loadTrips(); // Recarrega e aplica filtros
    };
    
    const deleteTrip = async (tripId) => {
        if (!confirm('Tem a certeza que quer apagar esta viagem?')) return;
        if (!currentUser) return;
        await db.collection('trips').doc(currentUser.uid).collection('user_trips').doc(tripId).delete();
        await loadTrips(); // Recarrega e aplica filtros
    };
    
    // --- 5. ATUALIZAÇÃO DA INTERFACE (UI) ---
    
    const updateUI = () => {
        updateSummaryAndList();
        updateChart();
    };

    const updateSummaryAndList = () => {
        tripList.innerHTML = '';
        filteredTrips.forEach(trip => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${trip.tripDate.toLocaleDateString('pt-PT')}</td>
                <td>${trip.userFare.toFixed(2)} €</td>
                <td>${trip.uberFee.toFixed(2)} €</td>
                <td><button class="delete-btn" data-id="${trip.id}">🗑️</button></td>
            `;
            if (trip.uberFee < 0) row.cells[2].style.color = 'var(--danger-color)';
            tripList.appendChild(row);
        });

        const totalUserFare = filteredTrips.reduce((sum, trip) => sum + trip.userFare, 0);
        const totalUberFee = filteredTrips.reduce((sum, trip) => sum + trip.uberFee, 0);
        const averageCommission = totalUserFare > 0 ? (totalUberFee / totalUserFare) * 100 : 0;
        
        totalUserFareEl.textContent = `${totalUserFare.toFixed(2)} €`;
        totalUberFeeEl.textContent = `${totalUberFee.toFixed(2)} €`;
        averageCommissionEl.textContent = `${averageCommission.toFixed(2)} %`;

        if (averageCommission > 25) averageCommissionEl.style.color = 'var(--danger-color)';
        else if (averageCommission > 22) averageCommissionEl.style.color = 'var(--warning-color)';
        else averageCommissionEl.style.color = 'var(--success-color)';
    };
    
    const updateChart = () => {
        if (!currentUser) {
            if (earningsChart) earningsChart.destroy();
            return;
        }

        // Processar dados para o gráfico
        const dataByDay = filteredTrips.reduce((acc, trip) => {
            const day = trip.tripDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            if (!acc[day]) {
                acc[day] = { userFare: 0, uberFee: 0 };
            }
            acc[day].userFare += trip.userFare;
            acc[day].uberFee += trip.uberFee;
            return acc;
        }, {});

        const sortedDays = Object.keys(dataByDay).sort();
        const labels = sortedDays.map(day => new Date(day+'T00:00:00').toLocaleDateString('pt-PT', {day:'2-digit', month:'short'}));
        const userFareData = sortedDays.map(day => dataByDay[day].userFare);
        const uberFeeData = sortedDays.map(day => dataByDay[day].uberFee);

        // Criar ou atualizar o gráfico
        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Tarifa Cliente (€)',
                    data: userFareData,
                    backgroundColor: '#4f46e5',
                },
                {
                    label: 'Comissão Uber (€)',
                    data: uberFeeData,
                    backgroundColor: '#f59e0b',
                }
            ]
        };
        
        if (earningsChart) {
            earningsChart.data = chartData;
            earningsChart.update();
        } else {
            earningsChart = new Chart(chartCanvas, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    };

    // --- 6. LÓGICA DE AUTENTICAÇÃO ---
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            // Utilizador está logado
            loginButton.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmailEl.textContent = user.email;
            premiumFeatures.style.display = 'block'; // Mostra funcionalidades premium
            loadTrips();
        } else {
            // Utilizador não está logado
            loginButton.style.display = 'block';
            userInfo.style.display = 'none';
            userEmailEl.textContent = '';
            premiumFeatures.style.display = 'none'; // Esconde funcionalidades premium
            allTrips = [];
            filteredTrips = [];
            updateUI();
        }
    });

    const signInWithGoogle = () => { /* ... (sem alterações) ... */ };
    const signOut = () => { /* ... (sem alterações) ... */ };
    // Cole as funções signInWithGoogle e signOut da versão anterior aqui.
    // Para poupar espaço, não as repeti.

    // --- 7. EVENT LISTENERS ---
    tripForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!tripDateInput.value) {
            alert('Por favor, selecione a data da viagem.');
            return;
        }

        const newTrip = { 
            userFare: parseFloat(userFareInput.value),
            uberFee: parseFloat(uberFeeInput.value),
            tripDate: new Date(tripDateInput.value), // Salva como objeto Date
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await addTrip(newTrip);
        tripForm.reset();
        tripDateInput.valueAsDate = new Date(); // Preenche a data de hoje por defeito
    });
    
    dateFilter.addEventListener('change', () => {
        if(dateFilter.value === 'custom') {
            customDateRange.style.display = 'flex';
        } else {
            customDateRange.style.display = 'none';
            applyFilters();
        }
    });

    startDateInput.addEventListener('change', applyFilters);
    endDateInput.addEventListener('change', applyFilters);
    
    // Outros Listeners... (copie-os da versão anterior)
    tripList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const tripId = e.target.getAttribute('data-id');
            deleteTrip(tripId);
        }
    });
    loginButton.addEventListener('click', signInWithGoogle);
    logoutButton.addEventListener('click', signOut);
    resetButton.addEventListener('click', () => { /* A lógica de reset precisa ser adaptada */ });

    // Preenche a data de hoje no formulário por defeito
    tripDateInput.valueAsDate = new Date();
});

// Funções de Autenticação (fora do DOMContentLoaded para melhor organização)
const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(error => {
        console.error("Erro no login com Google:", error);
        alert(`Erro ao tentar fazer login: ${error.message}`);
    });
};

const signOut = () => {
    firebase.auth().signOut();
};