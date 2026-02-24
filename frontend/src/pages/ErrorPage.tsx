import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";

interface ErrorPageProps {
  code?: number;
  message?: string;
  description?: string;
}

const errorConfigs: Record<
  number,
  {
    title: string;
    desc: string;
    tips: string[];
  }
> = {
  400: {
    title: "Bad Request",
    desc: "The request you sent is invalid or malformed. Please check your input and try again.",
    tips: [
      "Check that all required fields are filled correctly",
      "Verify that file formats are supported",
      "Clear your browser cache and try again",
      "Contact support if the issue persists",
    ],
  },
  401: {
    title: "Unauthorized",
    desc: "You need to be authenticated to access this resource. Please log in.",
    tips: [
      "Make sure you're logged in with the correct account",
      "Your session may have expired, try logging in again",
      "Clear cookies and login once more",
      "If you forgot your password, use the reset option",
    ],
  },
  403: {
    title: "Access Denied",
    desc: "You don't have permission to access this resource. Contact an administrator if you believe this is an error.",
    tips: [
      "Ensure you're using the correct account with proper permissions",
      "Request access from an administrator",
      "Check that your account role has the required access level",
      "Contact HR for permission updates",
    ],
  },
  404: {
    title: "Page Not Found",
    desc: "The page you're looking for doesn't exist. It might have been moved or deleted.",
    tips: [
      "Check the URL for typos or incorrect path",
      "Use the navigation menu to find the page",
      "Return to the dashboard and browse from there",
      "Contact support if you believe this page should exist",
    ],
  },
  500: {
    title: "Server Error",
    desc: "Something went wrong on our end. Our team has been notified and is working to fix it.",
    tips: [
      "Try refreshing the page in a few moments",
      "Clear your browser cache and cookies",
      "Try using a different browser",
      "Contact support with the error code if the issue continues",
    ],
  },
  502: {
    title: "Bad Gateway",
    desc: "The server is temporarily unavailable. Please try again in a few moments.",
    tips: [
      "Wait a few minutes and refresh the page",
      "Check your internet connection",
      "Try accessing the application from a different network",
      "Contact support if the issue persists",
    ],
  },
  503: {
    title: "Service Unavailable",
    desc: "The server is under maintenance. We'll be back online shortly.",
    tips: [
      "The application is temporarily under maintenance",
      "Check back in a few minutes",
      "Follow @WMSU on social media for updates",
      "Contact IT support for more information",
    ],
  },
  504: {
    title: "Gateway Timeout",
    desc: "The server took too long to respond. Please try again.",
    tips: [
      "Check your internet connection speed",
      "Try the action again, it may have been delayed",
      "Reduce the amount of data being processed",
      "Contact support if timeouts continue",
    ],
  },
};

export default function ErrorPage({ code: propCode, message, description }: ErrorPageProps) {
  const navigate = useNavigate();
  const { code: paramCode } = useParams<{ code: string }>();
  const finalCode = propCode || (paramCode ? Number(paramCode) : 404);
  const [animateIcon, setAnimateIcon] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setAnimateIcon(true);
  }, [finalCode]);

  const config = errorConfigs[finalCode] || errorConfigs[404];

  const handleAction = async (action: () => void, actionId: string) => {
    setActionLoading(actionId);
    setTimeout(() => {
      action();
      setActionLoading(null);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
      {/* Simple Header Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-red-700"></div>

      {/* Content */}
      <div className="text-center space-y-6 max-w-md">
        {/* Error Code */}
        <div
          className={`${animateIcon ? "animate-bounce" : ""} transition-all duration-500`}
        >
          <p className="text-7xl font-black text-red-700 animate-pulse">
            {finalCode}
          </p>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-red-900">
          {message || config.title}
        </h1>

        {/* Description */}
        <p className="text-base text-gray-700 leading-relaxed">
          {description || config.desc}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            onClick={() => handleAction(() => navigate("/"), "dashboard")}
            disabled={actionLoading !== null}
            className="bg-red-700 hover:bg-red-800 text-white font-semibold"
          >
            {actionLoading === "dashboard" ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAction(() => navigate(-1), "back")}
            disabled={actionLoading !== null}
            className="border-red-700 text-red-700 hover:bg-red-50 font-semibold"
          >
            {actionLoading === "back" ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-700"></div>
    </div>
  );
}
