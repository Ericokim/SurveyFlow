export const formatPhoneForDisplay = (phone) => {
  if (typeof phone !== 'string') {
    return phone;
  }

  return phone.startsWith('+') ? phone.slice(1) : phone;
};

export const formatRecipientForList = (recipient) => {
  if (!recipient) {
    return recipient;
  }

  return {
    ...recipient,
    phone: formatPhoneForDisplay(recipient.phone),
  };
};
