import React, { createContext, useContext, useState } from "react";

/**
 * Alert Context
 * Global state management for confirmation dialogs
 */

const AlertContext = createContext(null);

export const useAlertContext = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlertContext must be used within AlertProvider");
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    open: false,
    title: "",
    description: "",
    actionLabel: "Confirm",
    cancelLabel: "Cancel",
    actionStyle: "default", // 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'primary'
    loading: false,
    requiresConfirmation: false,
    confirmationText: "",
    confirmationMatch: "",
    confirmationPlaceholder: "",
    onAction: () => {},
    onCancel: () => {},
  });

  const openAlert = ({
    title,
    description,
    actionLabel = "Confirm",
    cancelLabel = "Cancel",
    actionStyle = "default",
    requiresConfirmation = false,
    confirmationText = "",
    confirmationMatch = "",
    confirmationPlaceholder = "",
    onAction = () => {},
    onCancel = () => {},
  }) => {
    setAlert({
      open: true,
      title,
      description,
      actionLabel,
      cancelLabel,
      actionStyle,
      loading: false,
      requiresConfirmation,
      confirmationText,
      confirmationMatch,
      confirmationPlaceholder,
      onAction,
      onCancel,
    });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const closeConfirmation = () => {
    if (alert.onCancel) {
      alert.onCancel();
    }
    closeAlert();
  };

  const setLoading = (loading) => {
    setAlert((prev) => ({ ...prev, loading }));
  };

  const value = {
    alert: {
      ...alert,
      closeConfirmation,
    },
    openAlert,
    closeAlert,
    setLoading,
  };

  return (
    <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
  );
};
