// app-logic.js - Logique d'accès et d'affichage Élève

async function initialiserEspaceEleve() {
    const urlParams = new URLSearchParams(window.location.search);
    const eleveId = urlParams.get('id');

    const loader = document.getElementById('loader');
    const dashboard = document.getElementById('dashboard-content');
    const accessDenied = document.getElementById('access-denied');
    const studentCodeDisplay = document.getElementById('student-code');

    if (!eleveId) {
        loader.style.display = 'none';
        accessDenied.style.display = 'block';
        return;
    }

    try {
        const snapshot = await firebase.database()
            .ref(`accompagnement/autorisations/${eleveId}`)
            .once('value');

        const authData = snapshot.val();

        loader.style.display = 'none';

        if (authData && authData.autorise === true) {
            dashboard.style.display = 'block';
            studentCodeDisplay.innerText = `Code : ${eleveId}`;
            chargerGraphiques();
        } else {
            accessDenied.style.display = 'block';
        }
    } catch (error) {
        console.error(error);
        loader.innerText = "Erreur de connexion.";
    }
}

function chargerGraphiques() {
    const ctx = document.getElementById('radarChart').getContext('2d');

    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Cognitif', 'Émotionnel', 'Social'],
            datasets: [{
                label: 'Mes compétences',
                data: [0, 0, 0],
                backgroundColor: 'rgba(37,117,252,0.2)',
                borderColor: 'rgba(37,117,252,1)',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                r: {
                    min: 0,
                    max: 100
                }
            }
        }
    });
}

window.onload = initialiserEspaceEleve;
