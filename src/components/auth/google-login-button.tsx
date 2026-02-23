import { useEffect } from "react";
import { renderGoogleButton } from "@/lib/auth";

interface GoogleLoginButtonProps {
  onSuccess?: (user: any) => void;
  // TODO: 실제 GCP 클라이언트 ID를 .env에 빼거나 상수로 넣으세요.
  clientId?: string;
}

export function GoogleLoginButton({
  onSuccess,
  clientId = "468959466359-rveprmcm0k334f2tjs3mnvc5vfef1640.apps.googleusercontent.com",
}: GoogleLoginButtonProps) {
  useEffect(() => {
    renderGoogleButton("google-login-div", clientId, onSuccess);
  }, [clientId, onSuccess]);

  return (
    <div
      id="google-login-div"
      className="min-w-[200px] h-[40px] flex items-center justify-center"
    >
      {/* GSI iframe will render here */}
      <span className="text-sm text-slate-400">Loading Login...</span>
    </div>
  );
}
