// 1. JWT 디코딩 헬퍼 함수
export function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// 2. 구글 로그인 버튼 렌더링 함수
export function renderGoogleButton(
    elementId: string,
    clientId: string,
    onSuccess?: (payload: any) => void
) {
    // @ts-ignore
    if (!window.google) {
        setTimeout(() => renderGoogleButton(elementId, clientId, onSuccess), 100);
        return;
    }

    // @ts-ignore
    window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
            const payload = parseJwt(response.credential);
            if (payload) {
                // localStorage에 토큰과 유저 정보 저장
                localStorage.setItem('google_token', response.credential);
                localStorage.setItem('user_info', JSON.stringify(payload));

                console.log('로그인 성공:', payload.name, payload.email);
                if (onSuccess) onSuccess(payload);
            }
        }
    });

    // 버튼 렌더링
    // @ts-ignore
    window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        { theme: "outline", size: "large", shape: "pill" } // 커스텀 옵션
    );
}

// 3. 로그아웃 헬퍼
export function logout() {
    localStorage.removeItem('google_token');
    localStorage.removeItem('user_info');
}

// 4. 유저 세션 확인
export function getUserSession() {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
}
