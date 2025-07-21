document.addEventListener('DOMContentLoaded', () => {
    // Selecionar os elementos do HTML
    const tripForm = document.getElementById('trip-form');
    const userFareInput = document.getElementById('user-fare');
    const uberFeeInput = document.getElementById('uber-fee');
    const tripList = document.getElementById('trip-list');
    
    const totalUserFareEl = document.getElementById('total-user-fare');
    const totalUberFeeEl = document.getElementById('total-uber-fee');
    const averageCommissionEl = document.getElementById('average-commission');
    
    const resetButton = document.getElementById('reset-button');

    // Array para guardar as viagens. Usamos o localStorage para os dados não se perderem ao fechar a página.
    let trips = JSON.parse(localStorage.getItem('tvde_trips')) || [];

    // Função para atualizar o ecrã
    const updateUI = () => {
        // 1. Limpar a lista de viagens atual
        tripList.innerHTML = '';
        
        // 2. Adicionar cada viagem à tabela
        trips.forEach(trip => {
            const row = document.createElement('tr');
            
            const commissionPercentage = trip.userFare > 0 ? (trip.uberFee / trip.userFare) * 100 : 0;

            row.innerHTML = `
                <td>${trip.userFare.toFixed(2)} €</td>
                <td>${trip.uberFee.toFixed(2)} €</td>
                <td>${commissionPercentage.toFixed(2)} %</td>
            `;

            // Adiciona cor vermelha para valores negativos na comissão da viagem individual
            if (trip.uberFee < 0) {
                 row.cells[1].style.color = 'var(--danger-color)';
                 row.cells[2].style.color = 'var(--danger-color)';
            }
            
            tripList.appendChild(row);
        });

        // 3. Calcular os totais
        const totalUserFare = trips.reduce((sum, trip) => sum + trip.userFare, 0);
        const totalUberFee = trips.reduce((sum, trip) => sum + trip.uberFee, 0);
        
        const averageCommission = totalUserFare > 0 ? (totalUberFee / totalUserFare) * 100 : 0;
        
        // 4. Atualizar o resumo
        totalUserFareEl.textContent = `${totalUserFare.toFixed(2)} €`;
        totalUberFeeEl.textContent = `${totalUberFee.toFixed(2)} €`;
        averageCommissionEl.textContent = `${averageCommission.toFixed(2)} %`;

        // Mudar a cor da percentagem se for acima de 25%
        if (averageCommission > 25) {
            averageCommissionEl.style.color = 'var(--danger-color)';
        } else if (averageCommission > 22) {
             averageCommissionEl.style.color = 'var(--warning-color)';
        } else {
            averageCommissionEl.style.color = 'var(--success-color)';
        }
        
        // 5. Guardar os dados no localStorage do navegador
        localStorage.setItem('tvde_trips', JSON.stringify(trips));
    };

    // Evento para quando o formulário é submetido
    tripForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Previne o recarregamento da página

        const userFare = parseFloat(userFareInput.value);
        const uberFee = parseFloat(uberFeeInput.value);

        // Validação atualizada: permite que uberFee seja negativo
        if (isNaN(userFare) || isNaN(uberFee) || userFare <= 0) {
            alert('Por favor, insira valores válidos. A "Tarifa do Utilizador" deve ser maior que zero.');
            return;
        }

        // A verificação abaixo foi removida na versão anterior, mas é bom mantê-la como um aviso suave.
        if (uberFee > userFare) {
            // Usamos confirm() para permitir que o utilizador prossiga se tiver a certeza.
            if (!confirm('Atenção: A comissão da Uber é maior que a tarifa do cliente. Isto é incomum. Deseja continuar?')) {
                return;
            }
        }
        
        // Adicionar a nova viagem ao array
        trips.push({ userFare, uberFee });
        
        // Limpar os campos do formulário
        userFareInput.value = '';
        uberFeeInput.value = '';
        userFareInput.focus(); // Coloca o cursor no primeiro campo

        // Atualizar tudo no ecrã
        updateUI();
    });
    
    // Evento para o botão de limpar tudo
    resetButton.addEventListener('click', () => {
        if (confirm('Tem a certeza que quer apagar todos os dados das viagens?')) {
            trips = []; // Esvazia o array
            localStorage.removeItem('tvde_trips'); // Limpa a memória do navegador
            updateUI(); // Atualiza o ecrã para mostrar tudo a zeros
        }
    });

    // Chamar a função uma vez no início para carregar os dados guardados
    updateUI();
});