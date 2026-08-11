// Importando funções necessárias do Firebase
import { initializeApp } from "https://gstatic.com";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://gstatic.com";

// COLE SUAS CONFIGURAÇÕES REAIS DO FIREBASE AQUI ABAIXO:
const firebaseConfig = {
  apiKey: "AIzaSyCc9yvNTlh-DFHjk38e3aQ9HwF0f-yDmUc",
  authDomain: "hermannusbots.firebaseapp.com",
  projectId: "hermannusbots",
  storageBucket: "hermannusbots.firebasestorage.app",
  messagingSenderId: "76496490010",
  appId: "1:76496490010:web:e43024b6bb3b69f2ad0ba3",
  measurementId: "G-YR3GG9GHP8"
};

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Mapeando Elementos do HTML
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userLoggedSpan = document.getElementById('user-logged');

// --- SISTEMA DE CADASTRO E LOGIN ---

// Ação de Cadastrar Usuário
btnRegister.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => alert("Conta criada com sucesso!"))
        .catch(error => alert("Erro ao cadastrar: " + error.message));
});

// Ação de Fazer Login
btnLogin.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => alert("Erro ao entrar: " + error.message));
});

// Ação de Sair da Conta
btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// Monitor de Estado (Saber se o usuário está logado ou não)
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        userLoggedSpan.innerText = user.email;
    } else {
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
        userLoggedSpan.innerText = "";
    }
});
