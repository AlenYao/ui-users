import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import {
  FormattedMessage,
  intlShape,
  injectIntl,
} from 'react-intl';
import {
  Callout,
  ConfirmationModal,
  Pane,
  Paneset,
  Modal,
  Row,
  Button,
  Col,
  MultiSelection,
} from '@folio/stripes/components';
import { Field } from 'redux-form';
import SafeHTMLMessage from '@folio/react-intl-safe-html';
import { EditableList } from '@folio/stripes/smart-components';
import { stripesConnect } from '@folio/stripes/core';
import { validate } from '../util';

class OwnerSettings extends React.Component {
  static manifest = Object.freeze({
    owners: {
      type: 'okapi',
      path: 'owners',
      records: 'owners',
      accumulate: 'true',
      throwErrors: false,
      PUT: {
        path: 'owners/%{activeRecord.id}',
      },
      DELETE: {
        path: 'owners/%{activeRecord.id}',
      },
      GET: {
        path: 'owners?query=cql.allRecords=1 sortby owner&limit=500'
      }
    },
    ownerServicePoints: {
      type: 'okapi',
      resource: 'service-points',
      path: 'service-points',
    },
    activeRecord: {},
  });

  static propTypes = {
    mutator: PropTypes.object,
    resources: PropTypes.object,
    intl: intlShape.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      showConfirmDialog: false,
      showItemInUseDialog: false,
      selectedItem: {},
      primaryField: 'owner',
    };

    this.validate = this.validate.bind(this);
    this.onCreateItem = this.onCreateItem.bind(this);
    this.onUpdateItem = this.onUpdateItem.bind(this);
    this.onDeleteItem = this.onDeleteItem.bind(this);
    this.showConfirmDialog = this.showConfirmDialog.bind(this);
    this.hideConfirmDialog = this.hideConfirmDialog.bind(this);
    this.hideItemInUseDialog = this.hideItemInUseDialog.bind(this);
  }

  onCreateItem(item) {
    return this.props.mutator.owners.POST(item);
  }

  onDeleteItem() {
    const { selectedItem } = this.state;

    this.props.mutator.activeRecord.update({ id: selectedItem.id });

    return this.props.mutator.owners.DELETE({ id: selectedItem.id })
      .then(() => {
        this.showDeletionSuccessCallout(selectedItem);
        this.deleteItemResolve();
      })
      .catch(() => {
        this.setState({ showItemInUseDialog: true });
        this.deleteItemReject();
      })
      .finally(() => this.hideConfirmDialog());
  }

  onUpdateItem(item) {
    this.props.mutator.activeRecord.update({ id: item.id });
    return this.props.mutator.owners.PUT(item);
  }

  hideConfirmDialog() {
    this.setState({
      showConfirmDialog: false,
      selectedItem: {},
    });
  }

  hideItemInUseDialog() {
    this.setState({
      showItemInUseDialog: false,
      selectedItem: {},
    });
  }

  showConfirmDialog(itemId) {
    const selectedItem = this.props.resources.owners.records.find(t => t.id === itemId);

    this.setState({
      showConfirmDialog: true,
      selectedItem,
    });

    return new Promise((resolve, reject) => {
      this.deleteItemResolve = resolve;
      this.deleteItemReject = reject;
    });
  }

  showDeletionSuccessCallout(item) {
    const message = (
      <SafeHTMLMessage
        id="stripes-smart-components.cv.termDeleted"
        values={{
          type: this.props.intl.formatMessage({ id: 'ui-users.owners.singular' }),
          term: item[this.state.primaryField],
        }}
      />
    );

    this.callout.sendCallout({ message });
  }

  validate({ items }) {
    const { primaryField } = this.state;
    const servicePoints = _.get(this.props.resources, ['ownerServicePoints', 'records', 0, 'servicepoints'], []);
    const none = servicePoints.find(s => s.name === 'None') || {};

    if (Array.isArray(items)) {
      const errors = [];

      items.forEach((item, index) => {
        // Start with getting a validation check from the parent component.
        const itemErrors = validate(item, index, items, 'owner', <FormattedMessage id="ui-users.owners.singular" />) || {};

        // Check if the primary field has had data entered into it.
        if (!item[primaryField]) {
          itemErrors[primaryField] = <FormattedMessage id="stripes-core.label.missingRequiredField" />;
        }

        const asp = item.servicePointOwner || [];
        asp.forEach(s => {
          if (s.value === none.id && asp.length > 1) {
            itemErrors.servicePointOwner = <FormattedMessage id="ui-users.owners.error" />;
          }
        });


        // Add the errors if we found any for this record.
        if (Object.keys(itemErrors).length) {
          errors[index] = itemErrors;
        }
      });

      if (errors.length) {
        return { items: errors };
      }
    }

    return {};
  }

  warn = ({ items }) => {
    const servicePoints = _.get(this.props.resources, ['ownerServicePoints', 'records', 0, 'servicepoints'], []);
    const none = servicePoints.find(s => s.name === 'None') || {};

    const warnings = [];
    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        const itemWarning = {};

        const asp = item.servicePointOwner || [];

        asp.forEach(s => {
          if (s.value === none.id) {
            itemWarning.servicePointOwner = <FormattedMessage id="ui-users.owners.warning" />;
          }
        });

        if (Object.keys(itemWarning).length) {
          warnings[index] = itemWarning;
        }
      });
    }
    return { items: warnings };
  }

  render() {
    if (!this.props.resources.owners) return <div />;
    const { intl: { formatMessage } } = this.props;
    const type = formatMessage({ id: 'ui-users.owners.singular' });
    const rows = this.props.resources.owners.records || [];
    const term = this.state.selectedItem[this.state.primaryField];
    const servicePoints = _.get(this.props.resources, ['ownerServicePoints', 'records', 0, 'servicepoints'], []);
    const serviceOwners = [];
    rows.forEach(o => {
      const asp = o.servicePointOwner || [];
      asp.forEach(s => {
        if (!serviceOwners.includes(s.value)) {
          serviceOwners.push(s.value);
        }
      });
    });
    const options = [];
    servicePoints.forEach(s => {
      if (!serviceOwners.includes(s.id) || s.name === 'None') {
        options.push({ value: s.id, label: s.name });
      }
    });

    const fieldComponents = {
      'servicePointOwner': ({ fieldProps }) => (
        <Field
          {...fieldProps}
          id="owner-service-point"
          component={MultiSelection}
          onChange={this.onChangeSelection}
          dataOptions={options}
          renderToOverlay
          marginBottom0
          onBlur={e => { e.preventDefault(); }}
        />
      )
    };

    const modalMessage = (
      <SafeHTMLMessage
        id="stripes-smart-components.cv.termWillBeDeleted"
        values={{
          type: formatMessage({ id: 'ui-users.owners.singular' }),
          term,
        }}
      />
    );

    const formatter = {
      'servicePointOwner': (value) => {
        const asp = value.servicePointOwner || [];
        const items = asp.map(a => <li>{a.label}</li>);
        return <ul>{items}</ul>;
      }
    };
    return (
      <Paneset>
        <Pane
          id="owners"
          defaultWidth="fill"
          fluidContentWidth
          height="100%"
          paneTitle={formatMessage({ id: 'ui-users.owners.label' })}
        >
          <EditableList
            id="settings-owners"
            {...this.props}
            label={formatMessage({ id: 'ui-users.owners.label' })}
            height="600"
            virtualize
            fieldComponents={fieldComponents}
            contentData={rows}
            createButtonLabel={<FormattedMessage id="stripes-core.button.new" />}
            visibleFields={['owner', 'desc', 'servicePointOwner']}
            columnMapping={{
              'owner': formatMessage({ id: 'ui-users.owners.columns.owner' }),
              'desc': formatMessage({ id: 'ui-users.owners.columns.desc' }),
              'servicePointOwner': formatMessage({ id: 'ui-users.owners.columns.asp' }),
            }}
            formatter={formatter}
            onUpdate={this.onUpdateItem}
            onCreate={this.onCreateItem}
            onDelete={this.showConfirmDialog}
            isEmptyMessage={
              formatMessage({ id: 'ui-users.owners.nodata' },
                { terms: 'label' })
            }
            validate={this.validate}
            warn={this.warn}
          />
          <ConfirmationModal
            id="confirm-delete-owner"
            open={this.state.showConfirmDialog}
            heading={(
              <FormattedMessage
                id="stripes-core.button.deleteEntry"
                values={{ entry: formatMessage({ id: 'ui-users.owners.singular' }) }}
              />
            )}
            message={modalMessage}
            onConfirm={this.onDeleteItem}
            onCancel={this.hideConfirmDialog}
            confirmLabel={<FormattedMessage id="stripes-core.button.delete" />}
          />
          <Modal
            id="hideItemInUseDialog"
            open={this.state.showItemInUseDialog}
            label={<FormattedMessage id="stripes-smart-components.cv.cannotDeleteTermHeader" values={{ type }} />}
            size="small"
          >
            <Row>
              <Col xs>
                <FormattedMessage id="ui-users.owners.cannotDeleteOwner" values={{ type }} />
                {'.'}
              </Col>
            </Row>
            <Row>
              <Col xs>
                <Button data-test-ok-button buttonStyle="primary" onClick={this.hideItemInUseDialog}>
                  <FormattedMessage id="stripes-core.label.okay" />
                </Button>
              </Col>
            </Row>
          </Modal>
          <Callout ref={(ref) => { this.callout = ref; }} />
        </Pane>
      </Paneset>
    );
  }
}

export default injectIntl(stripesConnect(OwnerSettings));
