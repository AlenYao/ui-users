import { cloneDeep, omit } from 'lodash';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import {
  Paneset,
  Pane,
  PaneMenu,
  PaneHeaderIconButton,
  TextField,
  TextArea,
  Icon,
  Button,
  Accordion,
  ExpandAllButton,
  Row,
  Col,
  ConfirmationModal,
  Headline
} from '@folio/stripes/components';
import { IfPermission } from '@folio/stripes/core';
import { ViewMetaData } from '@folio/stripes/smart-components';

import stripesForm from '@folio/stripes/form';
import { Field } from 'redux-form';

import ContainedPermissions from './ContainedPermissions';

class PermissionSetForm extends React.Component {
  static propTypes = {
    stripes: PropTypes.shape({
      hasPerm: PropTypes.func.isRequired,
      connect: PropTypes.func.isRequired,
    }).isRequired,
    initialValues: PropTypes.object,
    handleSubmit: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    onCancel: PropTypes.func,
    onRemove: PropTypes.func,
    pristine: PropTypes.bool,
    submitting: PropTypes.bool,
  };

  constructor(props) {
    super(props);

    this.saveSet = this.saveSet.bind(this);
    this.beginDelete = this.beginDelete.bind(this);
    this.confirmDeleteSet = this.confirmDeleteSet.bind(this);
    this.handleExpandAll = this.handleExpandAll.bind(this);
    this.handleSectionToggle = this.handleSectionToggle.bind(this);
    this.containedPermissions = props.stripes.connect(ContainedPermissions);
    this.cViewMetaData = props.stripes.connect(ViewMetaData);
    this.state = {
      confirmDelete: false,
      sections: {
        generalSection: true,
        permSection: true,
      },
    };
  }

  addFirstMenu() {
    return (
      <PaneMenu>
        <FormattedMessage id="ui-users.permissions.closePermissionSetDialog">
          { ariaLabel => (
            <PaneHeaderIconButton
              id="clickable-close-permission-set"
              onClick={this.props.onCancel}
              icon="times"
              ariaLabel={ariaLabel}
            />
          )}
        </FormattedMessage>
      </PaneMenu>
    );
  }

  beginDelete() {
    this.setState({
      confirmDelete: true,
    });
  }

  confirmDeleteSet(confirmation) {
    const selectedSet = this.props.initialValues;
    if (confirmation) {
      this.props.onRemove(selectedSet);
    } else {
      this.setState({ confirmDelete: false });
    }
  }

  handleExpandAll(sections) {
    this.setState((curState) => {
      const newState = cloneDeep(curState);
      newState.sections = sections;
      return newState;
    });
  }

  handleSectionToggle({ id }) {
    this.setState((curState) => {
      const newState = cloneDeep(curState);
      newState.sections[id] = !newState.sections[id];
      return newState;
    });
  }

  saveLastMenu() {
    const {
      pristine,
      submitting,
      initialValues,
    } = this.props;
    const { confirmDelete } = this.state;
    const edit = initialValues && initialValues.id;
    const saveLabel = edit ?
      <FormattedMessage id="ui-users.saveAndClose" /> :
      <FormattedMessage id="ui-users.permissions.createPermissionSet" />;

    return (
      <PaneMenu>
        {edit &&
          <IfPermission perm="perms.permissions.item.delete">
            <Button
              id="clickable-delete-set"
              buttonStyle="danger"
              onClick={this.beginDelete}
              disabled={confirmDelete}
              marginBottom0
            >
              <FormattedMessage id="ui-users.delete" />
            </Button>
          </IfPermission>
        }
        <Button
          id="clickable-save-permission-set"
          type="submit"
          buttonStyle="primary paneHeaderNewButton"
          marginBottom0
          disabled={(pristine || submitting)}
        >
          {saveLabel}
        </Button>
      </PaneMenu>
    );
  }

  saveSet(data) {
    const filtered = omit(data, ['childOf', 'grantedTo', 'dummy']);
    const permSet = Object.assign({}, filtered, {
      mutable: true,
      subPermissions: (data.subPermissions || []).map(p => p.permissionName),
    });

    this.props.onSave(permSet);
  }

  renderPaneTitle() {
    const { initialValues } = this.props;
    const selectedSet = initialValues || {};

    if (selectedSet.id) {
      return (
        <div>
          <Icon size="small" icon="edit" />
          <span>
            <FormattedMessage id="ui-users.edit">
              {(editLabel) => `${editLabel}: ${selectedSet.displayName}`}
            </FormattedMessage>
          </span>
        </div>
      );
    }

    return <FormattedMessage id="ui-users.permissions.newPermissionSet" />;
  }

  render() {
    const {
      stripes,
      handleSubmit,
      initialValues,
    } = this.props;

    const selectedSet = initialValues || {};
    const { confirmDelete, sections } = this.state;
    const disabled = !stripes.hasPerm('perms.permissions.item.put');

    const selectedName = selectedSet.displayName ||
      <FormattedMessage id="ui-users.permissions.untitledPermissionSet" />;

    const confirmationMessage = <FormattedMessage
      id="ui-users.permissions.deletePermissionSetMessage"
      values={{ name: <strong>{selectedName}</strong> }}
    />;

    const accordionLabel = (
      <Headline
        size="large"
        tag="h3"
      >
        <FormattedMessage id="ui-users.permissions.generalInformation" />
      </Headline>
    );

    return (
      <form
        id="form-permission-set"
        onSubmit={handleSubmit(this.saveSet)}
      >
        <Paneset isRoot>
          <Pane
            defaultWidth="100%"
            firstMenu={this.addFirstMenu()}
            lastMenu={this.saveLastMenu()}
            paneTitle={this.renderPaneTitle()}
          >
            <Row end="xs">
              <Col xs>
                <ExpandAllButton
                  accordionStatus={sections}
                  onToggle={this.handleExpandAll}
                />
              </Col>
            </Row>
            <Accordion
              open={sections.generalSection}
              id="generalSection"
              onToggle={this.handleSectionToggle}
              label={accordionLabel}
            >
              {selectedSet.metadata && selectedSet.metadata.createdDate &&
                <Row>
                  <Col xs={12}>
                    <this.cViewMetaData metadata={selectedSet.metadata} />
                  </Col>
                </Row>
              }
              <Row>
                <Col xs={8}>
                  <section>
                    <Field
                      label={<FormattedMessage id="ui-users.permissions.permissionSetName" />}
                      name="displayName"
                      id="input-permission-title"
                      component={TextField}
                      autoFocus
                      required
                      fullWidth
                      disabled={disabled}
                    />
                    <Field
                      label={<FormattedMessage id="ui-users.description" />}
                      name="description"
                      id="input-permission-description"
                      component={TextArea}
                      fullWidth
                      disabled={disabled}
                    />
                  </section>
                </Col>
              </Row>
            </Accordion>
            <ConfirmationModal
              id="deletepermissionset-confirmation"
              open={confirmDelete}
              heading={<FormattedMessage id="ui-users.permissions.deletePermissionSet" />}
              message={confirmationMessage}
              onConfirm={() => { this.confirmDeleteSet(true); }}
              onCancel={() => { this.confirmDeleteSet(false); }}
              confirmLabel={<FormattedMessage id="ui-users.delete" />}
            />

            <this.containedPermissions
              expanded={sections.permSection}
              onToggle={this.handleSectionToggle}
              accordionId="permSection"
              permToRead="perms.permissions.get"
              permToDelete="perms.permissions.item.put"
              permToModify="perms.permissions.item.put"
              {...this.props}
            />
          </Pane>
        </Paneset>
      </form>
    );
  }
}

export default stripesForm({
  form: 'permissionSetForm',
  navigationCheck: true,
  enableReinitialize: false,
})(PermissionSetForm);
