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

    // --- FUNÇÕES DE AUTENTICAÇÃO (definidas no topo para estarem disponíveis) ---
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
    let allTrips = []; 
    let filteredTrips = []; 
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
            allTrips = [];
            filteredTrips = [];
            updateUI();
            return;
        }

        const snapshot = await db.collection('trips').doc(currentUser.uid).collection('user_trips').orderBy('tripDate', 'desc').get();
        allTrips = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
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
            filteredTrips = allTrips;
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
        await loadTrips();
    };
    
    const deleteTrip = async (tripId) => {
        if (!confirm('Tem a certeza que quer apagar esta viagem?')) return;
        if (!currentUser) return;
        await db.collection('trips').doc(currentUser.uid).collection('user_trips').doc(tripId).delete();
        await loadTrips();
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
        if (!currentUser || filteredTrips.length === 0) {
            if (earningsChart) {
                earningsChart.destroy();
                earningsChart = null;
            }
            chartCanvas.style.display = 'none';
            return;
        }
        
        chartCanvas.style.display = 'block';

        const totalUserFare = filteredTrips.reduce((sum, trip) => sum + trip.userFare, 0);
        const totalUberFee = filteredTrips.reduce((sum, trip) => sum + trip.uberFee, 0);
        const yourNetEarnings = totalUserFare - totalUberFee;

        const chartData = {
            labels: ['Seu Rendimento Líquido', 'Comissão da Plataforma'],
            datasets: [{
                data: [yourNetEarnings, totalUberFee],
                backgroundColor: ['#4f46e5', '#f59e0b'],
                borderColor: '#1e293b',
                borderWidth: 2
            }]
        };

        if (earningsChart) {
            earningsChart.destroy();
        }

        // Regista o plugin globalmente uma vez
        Chart.register(ChartDataLabels);

        earningsChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#e2e8f0' }
                    },
                    datalabels: {
                        formatter: (value, context) => {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? (value / total * 100).toFixed(1) + '%' : '0%';
                            return `€${value.toFixed(2)}\n(${percentage})`;
                        },
                        color: '#fff',
                        font: { weight: 'bold', size: 14 },
                        textAlign: 'center',
                    }
                }
            }
        });
    };

    // --- 6. LÓGICA DE AUTENTICAÇÃO ---
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            loginButton.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmailEl.textContent = user.email;
            premiumFeatures.style.display = 'block';
            loadTrips();
        } else {
            loginButton.style.display = 'block';
            userInfo.style.display = 'none';
            userEmailEl.textContent = '';
            premiumFeatures.style.display = 'none';
            allTrips = [];
            filteredTrips = [];
            updateUI();
        }
    });


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
            tripDate: new Date(tripDateInput.value),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await addTrip(newTrip);
        tripForm.reset();
        tripDateInput.valueAsDate = new Date();
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
    
    tripList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const tripId = e.target.getAttribute('data-id');
            deleteTrip(tripId);
        }
    });

    loginButton.addEventListener('click', signInWithGoogle);
    logoutButton.addEventListener('click', signOut);
    // A lógica para resetar dados no Firestore precisa ser revista, mas deixamos por enquanto
    resetButton.addEventListener('click', () => alert('A função de apagar todos os dados está em desenvolvimento.')); 

    tripDateInput.valueAsDate = new Date();
});