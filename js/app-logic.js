// app-logic.js - Version "Autonome" (Sans chargement externe)

const userCode = new URLSearchParams(window.location.search).get("id");

// --- DONNÉES INTÉGRÉES (Pour éviter l'erreur 404) ---
const REFERENTIEL_DATA = {
  "projet": "Accompagnement CPS",
  "axes": [
    {
      "id": "COG",
      "nom": "Compétences Cognitives",
      "couleur": "#3498db",
      "phases": [
        {
          "id": 1,
          "nom": "Phase 1 : Renforcer sa conscience de soi",
          "competences_generales": [
            {
              "id": "C1",
              "nom": "Conscience de soi",
              "competences_specifiques": [
                { "id": "C1.1", "nom": "Accroître sa connaissance de soi" },
                { "id": "C1.2", "nom": "Savoir penser de façon critique" },
                { "id": "C1.3", "nom": "Connaître ses valeurs et besoins" },
                { "id": "C1.4", "nom": "Prendre des décisions constructives" },
                { "id": "C1.5", "nom": "S’auto-évaluer positivement" },
                { "id": "C1.6", "nom": "Renforcer sa pleine attention" }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "EMO",
      "nom": "Compétences Émotionnelles",
      "couleur": "#e74c3c",
      "phases": [
        {
          "id": 1,
          "nom": "Phase 1 : Renforcer sa conscience des émotions",
          "competences_generales": [
            {
              "id": "E1",
              "nom": "Conscience des émotions",
              "competences_specifiques": [
                { "id": "E1.1", "nom": "Comprendre les émotions" },
                { "id": "E1.2", "nom": "Identifier ses émotions" }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "SOC",
      "nom": "Compétences Sociales",
      "couleur": "#2ecc71",
      "phases": [
        {
          "id": 1,
          "nom": "Phase 1 : Développer des relations constructives",
          "competences_generales": [
            {
              "id": "S1",
              "nom": "Relations constructives",
              "competences_specifiques": [
                { "id": "S1.1", "nom": "Communiquer de façon efficace" },
                { "id": "S1.2", "nom": "Communiquer de façon empathique" },
                { "id": "S1.3", "nom": "Développer des liens prosociaux" }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// État global
let userData = { competences_validees: {} };

// 1. Démarrage
function initApp() {
    if (!userCode) {
        window.location.href = "index.html";
        return;
    }
    
    // Affichage du code
    const displayElement = document.getElementById('code-eleve-display');
    if(displayElement) displayElement.innerText = `Code : ${userCode}`;
    
    // On masque le loader tout de suite car on a déjà les données
    const loader = document.getElementById('loader');
    const content = document.getElementById('dashboard-content');
    if(loader) loader.style.display = 'none';
    if(content) content.style.display = 'block';

    // Connexion Firebase
    try {
        const dbRef = firebase.database().ref(`accompagnement/eleves/${userCode}`);
        dbRef.on('value', (snapshot) => {
            const val = snapshot.val();
            if (val) {
                userData = val;
                if (!userData.competences_validees) userData.competences_validees = {};
            }
            // On met à jour l'affichage avec les données Firebase + Notre référentiel local
            updateUI(); 
        });
    } catch (error) {
        console.error("Erreur Firebase:", error);
        alert("Erreur de connexion. Vérifiez internet.");
    }
}

// 2. Mise à jour de l'interface
function updateUI() {
    calculerScores();
    genererCartesActions();
}

// 3. Calcul des scores
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

// 4. Génération des cartes
function genererCartesActions() {
    const container = document.getElementById('actions-container');
    if (!container) return;
    
    container.innerHTML = '<h3>🎯 Mes Objectifs</h3>';

    REFERENTIEL_DATA.axes.forEach(axe => {
        axe.phases.forEach(phase => {
            phase.competences_generales.forEach(cg => {
                cg.competences_specifiques.forEach(cs => {
                    const estValide = userData.competences_validees && userData.competences_validees[cs.id];
                    
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
                    card.onclick = () => toggleCompetence(cs.id, !estValide);
                    container.appendChild(card);
                });
            });
        });
    });
}

// 5. Action clic
function toggleCompetence(idComp, nouvelEtat) {
    if(!userData.competences_validees) userData.competences_validees = {};
    userData.competences_validees[idComp] = nouvelEtat;
    
    firebase.database().ref(`accompagnement/eleves/${userCode}/competences_validees/${idComp}`).set(nouvelEtat);
}

// Lancement
window.onload = initApp;
