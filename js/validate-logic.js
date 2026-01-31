// validate-logic.js - Logique de validation par l'adulte

// Variables globales pour stocker les données du référentiel
let referentielData = null;
let currentEleveId = null;

// 1. Initialisation au chargement de la page
window.onload = async function() {
    // Récupérer l'ID de l'élève depuis l'URL (ex: validate.html?id=A92F3K)
    const urlParams = new URLSearchParams(window.location.search);
    currentEleveId = urlParams.get('id');

    const loadingMsg = document.getElementById('loading-msg');
    const errorMsg = document.getElementById('error-msg');
    const formSection = document.getElementById('validation-form');
    const displayCode = document.getElementById('display-code-eleve');

    if (!currentEleveId) {
        loadingMsg.style.display = 'none';
        errorMsg.style.display = 'block';
        return;
    }

    displayCode.textContent = currentEleveId;

    try {
        // 2. Vérifier si l'élève existe dans les autorisations Firebase
        // (Optionnel mais recommandé pour éviter de valider des codes fantômes)
        const snapshot = await firebase.database().ref(`accompagnement/autorisations/${currentEleveId}`).once('value');
        
        if (!snapshot.exists()) {
            throw new Error("Élève non trouvé ou non autorisé.");
        }

        // 3. Charger le référentiel JSON
        const response = await fetch('data/referentiel/referentiel_cps.json');
        referentielData = await response.json();

        // 4. Initialiser le premier menu déroulant (Axes)
        initialiserMenuAxes();

        // Afficher le formulaire et masquer le chargement
        loadingMsg.style.display = 'none';
        formSection.style.display = 'block';

    } catch (error) {
        console.error(error);
        loadingMsg.style.display = 'none';
        errorMsg.innerHTML = `<strong>Erreur :</strong> ${error.message}`;
        errorMsg.style.display = 'block';
    }
};

// --- GESTION DES MENUS DÉROULANTS (CASCADE) ---

function initialiserMenuAxes() {
    const selectAxe = document.getElementById('select-axe');
    
    referentielData.axes.forEach(axe => {
        const option = document.createElement('option');
        option.value = axe.id; // Ex: COG
        option.text = axe.nom; // Ex: Compétences Cognitives
        selectAxe.appendChild(option);
    });

    // Écouteur d'événement : Quand on change d'axe
    selectAxe.addEventListener('change', (e) => {
        remplirCompetences(e.target.value);
    });
}

function remplirCompetences(axeId) {
    const selectComp = document.getElementById('select-competence');
    const selectInd = document.getElementById('select-indicateur');
    
    // Reset des menus suivants
    selectComp.innerHTML = '<option value="" selected disabled>Sélectionner...</option>';
    selectComp.disabled = false;
    selectInd.innerHTML = '<option value="" selected disabled>--</option>';
    selectInd.disabled = true;

    // Trouver l'axe sélectionné dans les données
    const axeData = referentielData.axes.find(a => a.id === axeId);
    if (!axeData) return;

    // Parcourir les phases et compétences (On aplatit la structure pour l'affichage)
    axeData.phases.forEach(phase => {
        phase.competences_generales.forEach(compGen => {
            compGen.competences_specifiques.forEach(compSpec => {
                const option = document.createElement('option');
                option.value = compSpec.id; // Ex: C1.1
                option.text = `${compSpec.id} - ${compSpec.nom}`;
                // On stocke les indicateurs directement dans l'option pour s'en servir après
                option.dataset.indicateurs = JSON.stringify(compSpec.indicateurs);
                selectComp.appendChild(option);
            });
        });
    });

    // Écouteur : Quand on change de compétence
    selectComp.addEventListener('change', (e) => {
        // Récupérer les indicateurs stockés dans l'option choisie
        const selectedOption = selectComp.options[selectComp.selectedIndex];
        const indicateurs = JSON.parse(selectedOption.dataset.indicateurs || "[]");
        remplirIndicateurs(indicateurs);
    });
}

function remplirIndicateurs(listeIndicateurs) {
    const selectInd = document.getElementById('select-indicateur');
    
    selectInd.innerHTML = '<option value="" selected disabled>Sélectionner un indicateur observable...</option>';
    selectInd.disabled = false;

    listeIndicateurs.forEach((texte, index) => {
        const option = document.createElement('option');
        option.value = index; // On garde l'index (0, 1, 2...)
        option.text = texte;
        selectInd.appendChild(option);
    });
}

// --- GESTION DE LA SOUMISSION (ENVOI FIREBASE) ---

document.getElementById('form-cps').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSubmit = document.querySelector('.btn-validate');
    const originalBtnText = btnSubmit.innerText;
    btnSubmit.disabled = true;
    btnSubmit.innerText = "Envoi en cours...";

    try {
        // Récupération des valeurs
        const axeId = document.getElementById('select-axe').value;
        const compId = document.getElementById('select-competence').value;
        
        // Pour l'indicateur, on veut le texte, pas juste l'index
        const selectInd = document.getElementById('select-indicateur');
        const indicateurTexte = selectInd.options[selectInd.selectedIndex].text;
        
        const contexte = document.getElementById('contexte').value;
        const typeValidateur = document.getElementById('type-validateur').value;
        const commentaire = document.getElementById('commentaire').value;

        // Création de l'objet Validation
        const validationData = {
            eleve_id: currentEleveId,
            axe: axeId,
            competence_id: compId,
            indicateur: indicateurTexte,
            contexte: contexte,
            validateur: typeValidateur,
            commentaire: commentaire,
            timestamp: firebase.database.ServerValue.TIMESTAMP, // Date serveur fiable
            date_lisible: new Date().toLocaleDateString('fr-FR')
        };

        // Envoi vers Firebase (Push crée un ID unique automatiquement)
        await firebase.database().ref('accompagnement/validations').push(validationData);

        alert("✅ Compétence validée avec succès !");
        
        // Reset partiel du formulaire pour permettre une autre validation rapide
        document.getElementById('select-indicateur').value = "";
        document.getElementById('commentaire').value = "";
        btnSubmit.disabled = false;
        btnSubmit.innerText = originalBtnText;

    } catch (error) {
        console.error(error);
        alert("Erreur lors de l'enregistrement. Vérifiez votre connexion.");
        btnSubmit.disabled = false;
        btnSubmit.innerText = originalBtnText;
    }
});
