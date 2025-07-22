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

    // --- FUNÇÕES DE AUTENTICAÇÃO ---
    const signInWithGoogle = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Erro no login com Google:", error);
            if (error.code !== 'auth/cancelled-popup-request') {
                alert(`Erro ao tentar fazer login: ${error.message}`);
            }
        });
    };
    const signOut = () => {
        firebase.auth().signOut();
    };

    // --- 2. SELETORES DE ELEMENTOS HTML ---
    const formTitle = document.getElementById('form-title');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const guestWarning = document.getElementById('guest-warning');
    const loginLink = document.getElementById('login-link');
    const tripForm = document.getElementById('trip-form');
    const userFareInput = document.getElementById('user-fare');
    const uberFeeInput = document.getElementById('uber-fee');
    const tripDateInput = document.getElementById('trip-date');
    const tripList = document.getElementById('trip-list');
    const totalUserFareEl = document.getElementById('total-user-fare');
    const totalUberFeeEl = document.getElementById('total-uber-fee');
    const averageCommissionEl = document.getElementById('average-commission');
    const resetButton = document.getElementById('reset-button');
    const summaryPeriodLabel = document.getElementById('summary-period-label');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userInfo = document.getElementById('user-info');
    const userEmailEl = document.getElementById('user-email');
    const dateFilter = document.getElementById('date-filter');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const chartCanvas = document.getElementById('earnings-chart');
    const suggestionFab = document.getElementById('suggestion-fab');
    const suggestionModal = document.getElementById('suggestion-modal');
    const suggestionForm = document.getElementById('suggestion-form');
    const suggestionText = document.getElementById('suggestion-text');
    const modalCloseBtn = document.querySelector('.modal-close-btn');

    // --- 3. ESTADO DA APLICAÇÃO ---
    let allTrips = []; 
    let filteredTrips = []; 
    let currentUser = null;
    let earningsChart = null;
    let operationMode = 'local';
    let editingTripId = null;

    // --- 4. FUNÇÕES DE DADOS ---
    const loadTrips = async () => {
        if (operationMode === 'firestore' && currentUser) {
            const snapshot = await db.collection('trips').doc(currentUser.uid).collection('user_trips').orderBy('tripDate', 'desc').get();
            allTrips = snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, tripDate: data.tripDate.toDate() };
            });
        }
        applyFilters();
    };
    const addTrip = async (trip) => {
        if (operationMode === 'firestore') {
            await db.collection('trips').doc(currentUser.uid).collection('user_trips').add(trip);
        } else {
            const tripWithId = { ...trip, id: Date.now().toString() };
            allTrips.push(tripWithId);
        }
        await loadTrips();
    };
    const deleteTrip = async (tripId) => {
        if (!confirm('Tem a certeza que quer apagar esta viagem?')) return;
        if (operationMode === 'firestore') {
            await db.collection('trips').doc(currentUser.uid).collection('user_trips').doc(tripId).delete();
        } else {
            allTrips = allTrips.filter(t => t.id !== tripId);
        }
        await loadTrips();
    };
    const resetData = async () => {
        if (!confirm('Tem a certeza que quer apagar TODOS os dados do período?')) return;
        if (operationMode === 'firestore') {
             alert('A função de apagar todos os dados da nuvem está em desenvolvimento.');
             return;
        } else {
            allTrips = [];
            filteredTrips = [];
        }
        updateUI();
    };
    const updateTrip = async (tripId, updatedData) => {
        if (operationMode === 'firestore') {
            await db.collection('trips').doc(currentUser.uid).collection('user_trips').doc(tripId).update(updatedData);
        } else {
            const tripIndex = allTrips.findIndex(t => t.id === tripId);
            if (tripIndex > -1) {
                allTrips[tripIndex] = { ...allTrips[tripIndex], ...updatedData };
            }
        }
        await loadTrips();
    };
    
    // --- 5. LÓGICA DE FILTROS E UI ---
    const startEditMode = (tripId) => {
        editingTripId = tripId;
        const trip = allTrips.find(t => t.id === tripId);
        if (!trip) return;
        userFareInput.value = trip.userFare;
        uberFeeInput.value = trip.uberFee;
        tripDateInput.value = trip.tripDate.toISOString().split('T')[0];
        formTitle.textContent = "Editar Viagem";
        tripForm.querySelector('.btn-add').textContent = "Guardar Alterações";
        cancelEditBtn.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEditMode = () => {
        editingTripId = null;
        tripForm.reset();
        tripDateInput.valueAsDate = new Date();
        formTitle.textContent = "Adicionar Nova Viagem";
        tripForm.querySelector('.btn-add').textContent = "Adicionar Viagem";
        cancelEditBtn.style.display = 'none';
    };

    const getDatesForFilter = (filterValue) => {
        const now = new Date();
        let start, end;
        switch(filterValue) {
            case 'this-month': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); break;
            case 'last-month': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); break;
            case 'custom': start = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null; end = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null; break;
            default: start = null; end = null;
        }
        return { start, end };
    };
    const applyFilters = () => {
        const filterValue = dateFilter.value;
        const { start, end } = getDatesForFilter(filterValue);
        let tripsToFilter = [...allTrips];
        if (start && end) {
            filteredTrips = tripsToFilter.filter(trip => trip.tripDate >= start && trip.tripDate <= end);
        } else {
            filteredTrips = tripsToFilter;
        }
        const selectedOption = dateFilter.options[dateFilter.selectedIndex];
        summaryPeriodLabel.textContent = `(${selectedOption.text})`;
        updateUI();
    };
    const updateUI = () => {
        updateSummaryAndList();
        updateChart();
    };
    const updateSummaryAndList = () => {
        tripList.innerHTML = '';
        filteredTrips.sort((a,b) => b.tripDate - a.tripDate).forEach(trip => {
            const row = document.createElement('tr');
            const commissionPercentage = trip.userFare > 0 ? (trip.uberFee / trip.userFare) * 100 : 0;
            const formattedDate = trip.tripDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
            row.innerHTML = `<td>${formattedDate}</td><td>${trip.userFare.toFixed(2)} €</td><td>${trip.uberFee.toFixed(2)} €</td><td>${commissionPercentage.toFixed(1)} %</td><td><button class="action-btn edit-btn" data-id="${trip.id}" title="Editar">✏️</button><button class="action-btn delete-btn" data-id="${trip.id}" title="Apagar">🗑️</button></td>`;
            if (trip.uberFee < 0) {
                row.cells[2].style.color = 'var(--danger-color)';
                row.cells[3].style.color = 'var(--danger-color)';
            } else if (commissionPercentage > 25) {
                row.cells[3].style.color = 'var(--warning-color)';
            }
            tripList.appendChild(row);
        });
        const totalUserFare = filteredTrips.reduce((sum, trip) => sum + trip.userFare, 0);
        const totalUberFee = filteredTrips.reduce((sum, trip) => sum + trip.uberFee, 0);
        const averageCommission = totalUserFare > 0 ? (totalUberFee / totalUserFare) * 100 : 0;
        totalUserFareEl.textContent = `${totalUserFare.toFixed(2)} €`;
        totalUberFeeEl.textContent = `${totalUberFee.toFixed(2)} €`;
        averageCommissionEl.textContent = `${averageCommission.toFixed(2)} %`;
        if (averageCommission > 25) averageCommissionEl.style.color = 'var(--danger-color)'; else if (averageCommission > 22) averageCommissionEl.style.color = 'var(--warning-color)'; else averageCommissionEl.style.color = 'var(--success-color)';
    };
    const updateChart = () => {
        if (filteredTrips.length === 0) {
            if (earningsChart) { earningsChart.destroy(); earningsChart = null; }
            chartCanvas.style.display = 'none';
            return;
        }
        chartCanvas.style.display = 'block';
        const totalUserFare = filteredTrips.reduce((sum, trip) => sum + trip.userFare, 0);
        const totalUberFee = filteredTrips.reduce((sum, trip) => sum + trip.uberFee, 0);
        const yourNetEarnings = totalUserFare - totalUberFee;
        const chartData = {
            labels: ['Seu Rendimento Líquido', 'Recebido Uber (€)'],
            datasets: [{ data: [yourNetEarnings, totalUberFee], backgroundColor: ['#4f46e5', '#f59e0b'], borderColor: '#1e293b', borderWidth: 2 }]
        };
        if (earningsChart) { earningsChart.destroy(); }
        Chart.register(ChartDataLabels);
        earningsChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#e2e8f0' } },
                    datalabels: {
                        formatter: (value, context) => {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? (value / total * 100).toFixed(1) + '%' : '0%';
                            return `€${value.toFixed(2)}\n(${percentage})`;
                        },
                        color: '#fff', font: { weight: 'bold', size: 14 }, textAlign: 'center',
                    }
                }
            }
        });
    };

    // --- 6. LÓGICA DE AUTENTICAÇÃO ---
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            operationMode = 'firestore';
            loginButton.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmailEl.textContent = user.email;
            guestWarning.style.display = 'none';
        } else {
            operationMode = 'local';
            allTrips = []; 
            cancelEditMode(); // Garante que sai do modo de edição ao fazer logout
            loginButton.style.display = 'block';
            userInfo.style.display = 'none';
            userEmailEl.textContent = '';
            guestWarning.style.display = 'block';
        }
        loadTrips();
    });

    // --- 7. EVENT LISTENERS ---
    tripForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!tripDateInput.value) {
            alert('Por favor, selecione a data da viagem.');
            return;
        }
        const tripData = { 
            userFare: parseFloat(userFareInput.value),
            uberFee: parseFloat(uberFeeInput.value),
            tripDate: new Date(tripDateInput.value)
        };
        if (editingTripId) {
            await updateTrip(editingTripId, tripData);
        } else {
            const newTrip = { ...tripData, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
            await addTrip(newTrip);
        }
        cancelEditMode();
    });

    tripList.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.action-btn');
        if (!targetButton) return;
        const tripId = targetButton.getAttribute('data-id');
        if (targetButton.classList.contains('edit-btn')) { startEditMode(tripId); }
        if (targetButton.classList.contains('delete-btn')) { deleteTrip(tripId); }
    });
    
    cancelEditBtn.addEventListener('click', cancelEditMode);

    loginLink.addEventListener('click', (e) => { e.preventDefault(); signInWithGoogle(); });
    
    dateFilter.addEventListener('change', () => {
        if(dateFilter.value === 'custom') { customDateRange.style.display = 'flex'; }
        else { customDateRange.style.display = 'none'; applyFilters(); }
    });
    
    startDateInput.addEventListener('change', applyFilters);
    endDateInput.addEventListener('change', applyFilters);
    
    loginButton.addEventListener('click', signInWithGoogle);
    logoutButton.addEventListener('click', signOut);
    resetButton.addEventListener('click', resetData);
    
    suggestionFab.addEventListener('click', () => { suggestionModal.style.display = 'flex'; });
    modalCloseBtn.addEventListener('click', () => { suggestionModal.style.display = 'none'; });
    suggestionModal.addEventListener('click', (e) => { if (e.target === suggestionModal) { suggestionModal.style.display = 'none'; } });
    
    suggestionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const suggestionContent = suggestionText.value.trim();
        const submitButton = suggestionForm.querySelector('button[type="submit"]');
        if (!suggestionContent) { alert('Por favor, escreva a sua sugestão.'); return; }
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
        try {
            await db.collection('suggestions').add({
                text: suggestionContent, submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userEmail: currentUser ? currentUser.email : 'Anónimo', userAgent: navigator.userAgent
            });
            alert('Obrigado! A sua sugestão foi enviada com sucesso.');
            suggestionText.value = ''; suggestionModal.style.display = 'none';
        } catch (error) {
            console.error("Erro ao enviar sugestão:", error);
            alert('Ocorreu um erro ao enviar a sua sugestão. Por favor, tente novamente.');
        } finally {
            submitButton.disabled = false; submitButton.textContent = 'Enviar Sugestão';
        }
    });

    tripDateInput.valueAsDate = new Date();
});