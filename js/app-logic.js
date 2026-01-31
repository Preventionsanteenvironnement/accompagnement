// app-logic.js - Cerveau de l'application Élève
// Version : Connectée au Référentiel CPS

const userCode = new URLSearchParams(window.location.search).get("id");

// État global de l'application
let referentiel = null;
let userData = {
    competences_validees: {} // Stocke les ID validés (ex: "C1.1": true)
};

// 1. Démarrage
async function initApp() {
    if (!userCode) {
        window.location.href = "index.html";
        return;
    }
    document.getElementById('code-eleve-display').innerText = `Code : ${userCode}`;
    
    try {
        // A. On charge le référentiel (les définitions)
        // ATTENTION : Ce fichier doit exister dans le dossier data du Cockpit
        // On va le chercher sur le site du cockpit car c'est la source unique
        const refResponse = await fetch('https://preventionsanteenvironnement.github.io/cockpit-accompagnement/data/referentiel/referentiel_cps.json');
        if (!refResponse.ok) throw new Error("Référentiel introuvable");
        referentiel = await refResponse.json();

        // B. On charge les données de l'élève depuis Firebase
        const dbRef = firebase.database().ref(`accompagnement/eleves/${userCode}`);
        dbRef.on('value', (snapshot) => {
            const val = snapshot.val();
            if (val) {
                userData = val;
                if (!userData.competences_validees) userData.competences_validees = {};
            }
            updateUI(); // Mettre à jour l'affichage quand les données changent
        });

    } catch (error) {
        console.error("Erreur init:", error);
        alert("Impossible de charger le programme. " + error.message);
    }
}

// 2. Mise à jour de l'interface (Graphique + Cartes)
function updateUI() {
    calculerScores();
    genererCartesActions();
}

// 3. Calcul des scores pour le graphique radar
function calculerScores() {
    if (!referentiel) return;

    // On prépare les scores pour les 3 axes (Cognitif, Émotionnel, Social)
    // Structure du graph : labels et data
    const scores = { "COG": 0, "EMO": 0, "SOC": 0 };
    const totals = { "COG": 0, "EMO": 0, "SOC": 0 };

    referentiel.axes.forEach(axe => {
        axe.phases.forEach(phase => {
            phase.competences_generales.forEach(cg => {
                cg.competences_specifiques.forEach(cs => {
                    totals[axe.id]++; // Une compétence de plus possible
                    if (userData.competences_validees[cs.id]) {
                        scores[axe.id]++; // Une compétence validée
                    }
                });
            });
        });
    });

    // Conversion en pourcentage pour le graph (0 à 100)
    const dataPercent = [
        totals["COG"] ? Math.round((scores["COG"] / totals["COG"]) * 100) : 0,
        totals["SOC"] ? Math.round((scores["SOC"] / totals["SOC"]) * 100) : 0,
        totals["EMO"] ? Math.round((scores["EMO"] / totals["EMO"]) * 100) : 0
    ];

    // Mise à jour du graphique Chart.js
    if (window.myRadarChart) {
        window.myRadarChart.data.datasets[0].data = dataPercent;
        window.myRadarChart.update();
    }
}

// 4. Génération des cartes (La liste des choses à faire)
function genererCartesActions() {
    const container = document.getElementById('actions-container'); // On suppose qu'on créera ce conteneur
    if (!container) return; // Si l'élément n'existe pas encore dans le HTML, on sort
    
    container.innerHTML = '<h3>🎯 Mes Objectifs</h3>';

    referentiel.axes.forEach(axe => {
        axe.phases.forEach(phase => {
            phase.competences_generales.forEach(cg => {
                cg.competences_specifiques.forEach(cs => {
                    const estValide = userData.competences_validees[cs.id];
                    
                    // On crée une "carte" pour chaque compétence
                    const card = document.createElement('div');
                    card.className = `card mb-2 p-3 ${estValide ? 'border-success' : ''}`;
                    card.style.cursor = 'pointer';
                    
                    card.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${cs.nom}</strong>
                                <br><small class="text-muted">${cg.nom}</small>
                            </div>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" 
                                       ${estValide ? 'checked' : ''} disabled>
                            </div>
                        </div>
                    `;

                    // Clic sur la carte = Valider/Dévalider
                    card.onclick = () => toggleCompetence(cs.id, !estValide);
                    
                    container.appendChild(card);
                });
            });
        });
    });
}

// 5. Action : Valider une compétence
function toggleCompetence(idComp, nouvelEtat) {
    // Mise à jour locale (optimiste)
    userData.competences_validees[idComp] = nouvelEtat;
    
    // Envoi Firebase
    firebase.database().ref(`accompagnement/eleves/${userCode}/competences_validees/${idComp}`).set(nouvelEtat);
    
    // Le graphique se mettra à jour automatiquement grâce au dbRef.on('value')
}

// Lancement
window.onload = initApp;
