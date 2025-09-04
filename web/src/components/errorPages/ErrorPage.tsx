import { FiAlertCircle } from "react-icons/fi";
import ErrorPageLayout from "./ErrorPageLayout";

export default function Error() {
  return (
    <ErrorPageLayout>
      <h1 className="text-2xl font-semibold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200">
        <p className=""> We encountered an issue</p>
        <FiAlertCircle className="text-error inline-block" />
      </h1>
      <div className="space-y-4 text-gray-600 dark:text-gray-300">
        <p>
          It seems there was a problem loading your assistant.
        </p>
        <p>
          Please contact flamur.xhafa@cloudlayer.ai for assistance
        </p>
        
      </div>
    </ErrorPageLayout>
  );
}
