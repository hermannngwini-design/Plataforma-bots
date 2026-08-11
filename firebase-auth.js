// Firebase Auth v10.12.0 - Engine Local Independente
export function getAuth() {
    return {
        createUserWithEmailAndPassword: (email, password) => {
            return new Promise((resolve, reject) => {
                if (password.length < 6) {
                    reject({ message: "A senha deve ter pelo menos 6 caracteres." });
                } else {
                    localStorage.setItem("user_session", email);
                    resolve({ user: { email } });
                }
            });
        },
        signInWithEmailAndPassword: (email, password) => {
            return new Promise((resolve, reject) => {
                const savedUser = localStorage.getItem("user_session");
                if (savedUser) {
                    resolve({ user: { email } });
                } else {
                    reject({ message: "Usuário não encontrado ou senha incorreta." });
                }
            });
        },
        signOut: () => {
            localStorage.removeItem("user_session");
            window.location.reload();
            return Promise.resolve();
        },
        onAuthStateChanged: (callback) => {
            const savedUser = localStorage.getItem("user_session");
            if (savedUser) {
                callback({ email: savedUser });
            } else {
                callback(null);
            }
        }
    };
}
export const createUserWithEmailAndPassword = (auth, email, password) => auth.createUserWithEmailAndPassword(email, password);
export const signInWithEmailAndPassword = (auth, email, password) => auth.signInWithEmailAndPassword(email, password);
export const signOut = (auth) => auth.signOut();
export const onAuthStateChanged = (auth, callback) => auth.onAuthStateChanged(callback);
