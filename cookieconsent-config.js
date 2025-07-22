// cookieconsent-config.js

import 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.0.1/dist/cookieconsent.css';

CookieConsent.run({
    // A sua configuração aqui
    guiOptions: {
        consentModal: {
            layout: 'box',
            position: 'bottom left',
            equalWeightButtons: true,
            flipButtons: false
        },
        preferencesModal: {
            layout: 'box',
            position: 'right',
            equalWeightButtons: true,
            flipButtons: false
        }
    },
    categories: {
        necessary: {
            readOnly: true
        },
        analytics: {
            // Categoria para o Google Analytics
        }
    },
    language: {
        default: 'pt',
        translations: {
            pt: {
                consentModal: {
                    title: 'Olá! Usamos cookies.',
                    description: 'Utilizamos cookies para analisar o tráfego do site e otimizar a sua experiência. Ao aceitar o nosso uso de cookies, os seus dados serão agregados com os dados de todos os outros utilizadores de forma anónima.',
                    acceptAllBtn: 'Aceitar todos',
                    acceptNecessaryBtn: 'Rejeitar todos',
                    showPreferencesBtn: 'Gerir preferências'
                },
                preferencesModal: {
                    title: 'Preferências de Consentimento de Cookies',
                    acceptAllBtn: 'Aceitar todos',
                    acceptNecessaryBtn: 'Rejeitar todos',
                    savePreferencesBtn: 'Guardar preferências',
                    closeIconLabel: 'Fechar modal',
                    sections: [
                        {
                            title: 'Uso de Cookies',
                            description: 'Utilizamos cookies para garantir as funcionalidades básicas do website e para melhorar a sua experiência online. Pode escolher, para cada categoria, se quer ou não participar a qualquer momento.'
                        },
                        {
                            title: 'Cookies estritamente necessários',
                            description: 'Estes cookies são essenciais para o bom funcionamento do nosso site. Sem estes cookies, o site não funcionaria corretamente.',
                            linkedCategory: 'necessary'
                        },
                        {
                            title: 'Cookies de Análise e Desempenho',
                            description: 'Estes cookies permitem-nos recolher dados anónimos sobre como os utilizadores interagem com a nossa aplicação, ajudando-nos a melhorar as funcionalidades e a sua experiência.',
                            linkedCategory: 'analytics'
                        }
                    ]
                }
            }
        }
    }
});