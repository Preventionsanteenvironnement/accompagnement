// app-logic.js - Version FINALE & CONNECTÉE
// Ce script écoute le bouton du prof en temps réel.

const userCode = new URLSearchParams(window.location.search).get("id");

// --- DONNÉES RÉFÉRENTIEL (Intégrées pour éviter tout bug de chargement) ---
const REFERENTIEL_DATA = {
  "axes": [
    {
      "id": "COG", "nom": "Compétences Cognitives", "phases": [
        { "id": 1, "competences_generales": [ { "id": "C1", "nom": "Conscience de soi", "competences_specifiques": [ { "id": "C1.1", "nom": "Accroître sa connaissance de soi" }, { "id": "C1.2", "nom": "Savoir penser de façon critique" }, { "id": "C1.3", "nom": "Connaître ses valeurs et besoins" }, { "id": "C1.4", "nom": "Prendre des décisions constructives" }, { "id": "C1.5", "nom": "S’auto-évaluer positivement" }, { "id": "C1.6", "nom": "Renforcer sa pleine attention" } ] } ] }
      ]
    },
    {
      "id": "EMO", "nom": "Compétences Émotionnelles", "phases": [
        { "id": 1, "competences_generales": [ { "id": "E1", "nom": "Conscience des émotions", "competences_specifiques": [ { "id": "E1.1", "nom": "Comprendre les émotions" }, { "id": "E1.2", "nom": "Identifier ses émotions" } ] } ] }
      ]
    },
    {
      "id": "SOC", "nom": "Compétences Sociales", "phases": [
        { "id": 1, "competences_generales": [ { "id": "S1", "nom": "Relations constructives", "competences_specifiques": [ { "id": "S1.1", "nom": "Communiquer de façon efficace" }, { "id": "S1.2", "nom": "Communiquer de façon empathique" }, { "id": "S1.3", "nom": "Développer des liens prosociaux" } ] } ] }
      ]
    }
  ]
};

// État global
let userData = { competences_validees: {} };

// 1. Démarrage
function initApp() {
    if (!userCode) { window.location.href = "index.html"; return; }
    
    // Affichage du code en haut
    const displayElement = document.getElementById('code-eleve-display');
    if(displayElement) displayElement.innerText = `Code : ${userCode}`;

    // ÉCOUTEUR PRINCIPAL : On surveille l'autorisation donnée par le prof
    const authRef = firebase.database().ref(`accompagnement/autorisations/${userCode}`);
    
    authRef.on('value', (snapshot) => {
        const data = snapshot.val();
        // Si data existe ET autorise == true, alors c'est bon
        const estAutorise = (data && data.autorise === true);
        
        gererAffichage(estAutorise);
        
        if (estAutorise) {
            // Si autorisé, on charge les compétences
            chargerCompetences();
        }
    });
}

// 2. Gestion de l'écran (Switch entre "Accès Refusé" et "Dashboard")
function gererAffichage(estAutorise) {
    const loader = document.getElementById('loader');
    const accessDenied = document.getElementById('access-denied');
    const dashboard = document.getElementById('dashboard-content');

    if (loader) loader.style.display = 'none'; // On vire le chargement

    if (estAutorise) {
        // C'est VERT : On affiche le dashboard
        if(accessDenied) accessDenied.style.display = 'none';
        if(dashboard) {
            dashboard.style.display = 'block';
            dashboard.classList.add('fade-in'); // Petite animation
        }
    } else {
        // C'est ROUGE : On affiche "Accès Restreint"
        if(dashboard) dashboard.style.display = 'none';
        if(accessDenied) {
            accessDenied.style.display = 'block';
            accessDenied.classList.add('fade-in');
        }
    }
}

// 3. Chargement des données de l'élève (Graphique)
function chargerCompetences() {
    const dbRef = firebase.database().ref(`accompagnement/eleves/${userCode}`);
    dbRef.on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
            userData = val;
            if (!userData.competences_validees) userData.competences_validees = {};
        }
        updateUI(); 
    });
}

// 4. Mise à jour Graphique + Liste
function updateUI() {
    calculerScores();
    genererCartesActions();
}

function calculerScores() {
    const scores = { "COG": 0, "EMO": 0, "SOC": 0 };
    const totals = { "COG": 0, "EMO": 0, "SOC": 0 };

    REFERENTIEL_DATA.axes.forEach(axe => {
        axe.phases.forEach(phase => {
            phase.competences_generales.forEach(cg => {
                cg.competences_specifiques.forEach(cs => {
                    totals[axe.id]++;
                    if (userData.competences_validees && userData.competences_validees[cs.id]) {
                        scores[axe.id]++;
                    }
                });
            });
        });
    });

    const dataPercent = [
        totals["COG"] ? Math.round((scores["COG"] / totals["COG"]) * 100) : 0,
        totals["SOC"] ? Math.round((scores["SOC"] / totals["SOC"]) * 100) : 0,
        totals["EMO"] ? Math.round((scores["EMO"] / totals["EMO"]) * 100) : 0
    ];

    if (window.myRadarChart) {
        window.myRadarChart.data.datasets[0].data = dataPercent;
        window.myRadarChart.update();
    }
}

function genererCartesActions() {
    const container = document.getElementById('actions-container');
    if (!container) return;
    
    container.innerHTML = ''; // On vide avant de remplir

    REFERENTIEL_DATA.axes.forEach(axe => {
        axe.phases.forEach(phase => {
            phase.competences_generales.forEach(cg => {
                cg.competences_specifiques.forEach(cs => {
                    const estValide = userData.competences_validees && userData.competences_validees[cs.id];
                    
                    const card = document.createElement('div');
                    card.className = `card mb-3 p-3 ${estValide ? 'border-success' : ''}`;
                    card.style.cursor = 'pointer';
                    // Style sombre pour les cartes
                    card.style.background = '#1e293b'; 
                    card.style.borderColor = estValide ? '#4ade80' : 'rgba(255,255,255,0.1)';
                    
                    card.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center text-white">
                            <div>
                                <strong style="font-size: 1.1em;">${cs.nom}</strong>
                                <br><small style="color: #94a3b8;">${cg.nom}</small>
                            </div>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" 
                                       ${estValide ? 'checked' : ''} disabled>
                            </div>
                        </div>
                    `;
                    card.onclick = () => toggleCompetence(cs.id, !estValide);
                    container.appendChild(card);
                });
            });
        });
    });
}

function toggleCompetence(idComp, nouvelEtat) {
    if(!userData.competences_validees) userData.competences_validees = {};
    userData.competences_validees[idComp] = nouvelEtat;
    firebase.database().ref(`accompagnement/eleves/${userCode}/competences_validees/${idComp}`).set(nouvelEtat);
}

window.onload = initApp;
