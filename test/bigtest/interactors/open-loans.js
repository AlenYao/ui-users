import {
  interactor,
  scoped,
  collection,
  count,
  Interactor,
  property,
} from '@bigtest/interactor';

import ButtonInteractor from '@folio/stripes-components/lib/Button/tests/interactor'; // eslint-disable-line

const getFormattedDate = () => {
  const dueDate = new Date();
  const day = ('0' + dueDate.getDate()).slice(-2);
  const month = ('0' + (dueDate.getMonth() + 1)).slice(-2);
  return month + '/' + day + '/' + dueDate.getFullYear();
};

@interactor class BulkOverrideModal {
  static defaultScope = '#bulk-override-modal';

  dueDatePicker = scoped('[data-test-due-date-picker]')
}

@interactor class BulkRenewalModal {
  static defaultScope = '#bulk-renewal-modal';

  overrideButton = scoped('[data-test-override-button]')
}

@interactor class ChangeDueDateOverlay {
  static defaultScope = '[data-test-change-due-date-dialog]';

  successDueDateChangeAlerts = collection('[data-test-success-due-date-change-alert]');
  dueDateCalendarButton = new ButtonInteractor('[data-test-calendar-button]');
  saveButton = new ButtonInteractor('[data-test-change-due-date-save-button]');
  cancelButton = new ButtonInteractor('[data-test-change-due-date-cancel-button]');
  requestsCount = scoped('[data-test-requests-count]');
  isSaveButtonDisabled = property('[data-test-change-due-date-save-button]', 'disabled');
}

@interactor class OpenLoans {
  static defaultScope = '[data-test-open-loans]';

  list = scoped('[data-test-open-loans-list]');
  requests = collection('[data-test-list-requests]');
  actionDropdowns = collection('[data-test-actions-dropdown]');
  actionDropdownRequestQueue = new Interactor('[data-test-dropdown-content-request-queue]');
  actionDropdownRenewButton = new Interactor('[data-test-dropdown-content-renew-button]');
  actionDropdownChangeDueDateButton = new Interactor('[data-test-dropdown-content-change-due-date-button]');
  requestsCount = count('[data-test-list-requests]');

  bulkRenewalModal = new BulkRenewalModal();
  bulkOverrideModal = new BulkOverrideModal();
  changeDueDateOverlay = new ChangeDueDateOverlay();
  dueDateCalendarCellButton = new ButtonInteractor(`[data-test-date="${getFormattedDate()}"]`);

  whenLoaded() {
    return this.when(() => this.list.isVisible);
  }
}

export default new OpenLoans(5000);
