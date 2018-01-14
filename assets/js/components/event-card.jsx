import React, { Component } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Icon,
  Input,
  Layout,
  Menu,
  Modal,
  Tabs,
  Select,
  message
} from 'antd'
import EditableText from './editable-text'
import EditableNumber from './editable-number'
import EditableDateRange from './editable-date-range'
import clipboard from 'clipboard-js'
import mtz from 'moment-timezone'

const { TextArea } = Input
const { Option } = Select

export default class EventCard extends Component {
  onSave = kv => {
    this.props.channel.push(`edit-${this.props.id}`, kv)
    this.setState({ saving: true })
  }

  onTypeChange = val =>
    this.props.channel.push(`edit-${this.props.id}`, ['type', val])
  onTagsChange = vals => this.props.channel.push(`tags-${this.props.id}`, vals)
  onCalendarChange = vals =>
    this.props.channel.push(`calendars-${this.props.id}`, vals)

  reject = () => this.setState({ rejecting: true, saving: true })

  rejectWithMessage = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'rejected',
      message: this.state.rejectionMessage
    })

  setRejectionMessage = e => this.setState({ rejectionMessage: e.target.value })

  cancelWithMessage = () => {
    this.setState({ saving: true })
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'cancelled',
      message: this.state.cancelMessage
    })
  }

  setCancelMessage = e => this.setState({ cancelMessage: e.target.value })

  cancel = () => this.setState({ canceling: true })
  cancelStage2 = () =>
    this.setState({ verifyingCancel: true, canceling: false })

  confirm = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'confirmed'
    })
    this.setState({ saving: true })
  }

  makeTentative = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'tentative'
    })
    this.setState({ saving: true })
  }

  markCalled = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: 'called'
    })
    this.setState({ saving: true })
  }

  markCalledAndConfirm = () => {
    this.setState({ saving: true })
    this.markCalled()
    this.confirm()
  }

  markLogistics = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: 'logisticsed'
    })
    this.setState({ saving: true })
  }

  markDebriefed = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: 'debriefed'
    })
    this.setState({ saving: true })
  }

  duplicate = () => this.props.channel.push(`duplicate-${this.props.id}`)
  checkout = () => this.props.channel.push(`checkout-${this.props.id}`)
  checkin = () => this.props.channel.push(`checkin-${this.props.id}`)

  state = {
    rejecting: false,
    rejectionMessage: '',
    canceling: false,
    verifyingCancel: false,
    cancelMessage: ''
  }

  componentWillReceiveProps(_nextProps) {
    this.state.saving = false
  }

  render() {
    const { event, category } = this.props

    const {
      title,
      tags,
      capacity,
      status,
      name,
      description,
      summary,
      instructions,
      location,
      start_date,
      end_date,
      contact,
      type,
      rsvp_download_url,
      attendance_count,
      browser_url,
      checked_out_by
    } = event

    const disabled = checked_out_by !== undefined && checked_out_by !== null

    console.log(this.state.canceling)

    const isVolEvent =
      tags.filter(t => t.includes('Source: Direct Publish')).length == 0

    const isDirectPublish =
      tags.filter(t => t.includes('Source: Direct Publish')).length > 0

    return (
      <Card
        title={
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={title}
            attr="title"
          />
        }
        extra={
          <div style={{ display: 'flex' }}>
            {this.state.saving ? (
              <div>
                {' '}
                <Icon type="loading" /> Saving{' '}
              </div>
            ) : disabled ? (
              <div>
                <Icon type="lock" /> Being edited by {checked_out_by}
              </div>
            ) : (
              [
                <span> {attendance_count || 0} RSVPs </span>,
                <div style={{ marginLeft: 30 }}>{this.renderButtons()}</div>
              ]
            )}
          </div>
        }
        style={{ width: '100%', marginTop: 25 }}
        bodyStyle={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
        <Modal
          visible={this.state.rejecting}
          title="Why are you rejecting the event?"
          okText="Reject and Send"
          onCancel={() => this.setState({ rejecting: false })}
          onOk={this.rejectWithMessage}>
          <p>
            Check for typos – this rejection message will be sent directly to
            the event host.
          </p>
          <TextArea
            rows={5}
            onChange={this.setRejectionMessage}
            value={this.state.rejectionMessage}
          />
        </Modal>

        <Modal
          visible={this.state.canceling}
          title="Why are you cancelling this event?"
          okText="Cancel"
          cancelText="Don't Cancel"
          onCancel={() =>
            this.setState({ canceling: false, verifyingCancel: false })
          }
          onOk={this.cancelStage2}>
          <TextArea
            rows={5}
            onChange={this.setCancelMessage}
            value={this.state.cancelMessage}
          />
        </Modal>

        <Modal
          visible={this.state.verifyingCancel}
          title="Are you sure?"
          okText="Cancel Irreversibly"
          okType="danger"
          onCancel={() =>
            this.setState({ cancelling: false, verifyingCancel: false })
          }
          cancelText="Don't Cancel"
          onOk={this.cancelWithMessage}>
          This cannot be undone.
        </Modal>

        <div>
          {isDirectPublish && (
            <Button disabled={true} style={{ cursor: 'none', color: 'green' }}>
              Direct Published
            </Button>
          )}
        </div>

        <br />
        <br />

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Link:</strong>
          <div>
            <a target="_blank" href={browser_url}>
              {browser_url}
            </a>
          </div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Capacity:</strong> (set to 0 for unlimited)
          <div>
            <EditableNumber
              disabled={disabled}
              value={capacity}
              attr="capacity"
              onSave={this.onSave}
              checkout={this.checkout}
              checkin={this.checkin}
            />
          </div>
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: '100%' }}>
          <strong>Description:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={description}
            attr="description"
            textarea={true}
          />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: '100%' }}>
          <strong>Instructions:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={instructions}
            attr="instructions"
            textarea={true}
          />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: '100%' }}>
          <strong>Type:</strong>{' '}
          <Select
            defaultValue={type}
            style={{ width: 300 }}
            onChange={this.onTypeChange}>
            {[
              'Phonebank',
              'Organizing meeting',
              'Tabling or Clipboarding',
              'Canvass',
              'Rally, march, or protest',
              'Other'
            ].map(o => <Option value={o}>{o}</Option>)}
          </Select>
        </div>

        {!this.props.hostEdit && (
          <div
            className="field-group"
            style={{ margin: 10, minWidth: 250, width: '100%' }}>
            <strong>Calendars:</strong>{' '}
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Calendars"
              onChange={this.onCalendarChange}
              defaultValue={tags
                .filter(t => t.includes('Calendar:'))
                .map(t => t.split(':')[1].trim())}>
              {calendarOptions.map(c => <Option key={c}>{c}</Option>)}
            </Select>
          </div>
        )}

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Date and Time</strong> <br />
          <EditableDateRange
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            start_date={start_date}
            end_date={end_date}
            time_zone={location.time_zone}
            time_zone_display={this.props.event.time_zone}
            onSave={this.onSave}
            attr="start_date"
          />
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Location</strong>
          <br />
          <Checkbox
            checked={location.public}
            onChange={e => this.onSave(['location.public', e.target.checked])}>
            Address Public?
          </Checkbox>
          <br />
          <br />
          <strong>Venue:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.venue}
            attr="location.venue"
          />
          <br />
          <strong>Address:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.address_lines[0]}
            attr="location.address_lines[0]"
          />
          <br />
          <strong>City:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.locality}
            attr="location.locality"
          />
          <br />
          <strong>State:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.region}
            attr="location.region"
          />
          <br />
          <strong>Zip:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.postal_code}
            attr="location.postal_code"
          />
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Host</strong>
          <br />
          <strong>Name:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.name}
            attr="contact.name"
          />
          <br />
          <strong>Phone Number:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.phone_number}
            attr="contact.phone_number"
          />
          <br />
          <Checkbox
            checked={contact.public}
            onChange={e => this.onSave(['contact.public', e.target.checked])}>
            Phone Public?
          </Checkbox>
          <br />
          <br />
          <strong>Email Address:</strong>{' '}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.email_address}
            attr="contact.email_address"
          />
        </div>

        {!this.props.hostEdit && (
          <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
            <strong>Tags:</strong>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Tags"
              onChange={this.onTagsChange}
              defaultValue={tags.filter(
                t => !t.includes('Calendar') && !t.includes('Event Type:')
              )}>
              {window.tagOptions
                .filter(
                  t => !t.includes('Event: Action') && !t.includes('Calendar')
                )
                .map(t => <Option key={t}>{t}</Option>)}
            </Select>
          </div>
        )}
      </Card>
    )
  }

  renderButtons() {
    const {
      category,
      event: { rsvp_download_url, organizer_edit_url }
    } = this.props

    return [
      <Dropdown
        overlay={
          <Menu>
            <Menu.Item>
              <Button
                style={{ width: '100%' }}
                onClick={() => window.open(rsvp_download_url)}>
                Download RSVPs
              </Button>
            </Menu.Item>
            <Menu.Item>
              <Button
                style={{ width: '100%' }}
                onClick={() =>
                  clipboard
                    .copy(rsvp_download_url)
                    .then(() =>
                      message.success('RSVP download link copied to clipboard')
                    )
                }>
                Copy RSVP Download Link
              </Button>
            </Menu.Item>
            <Menu.Item>
              <Button
                style={{ width: '100%' }}
                onClick={() =>
                  clipboard
                    .copy(organizer_edit_url)
                    .then(() =>
                      message.success('Organizer edit link copied to clipboard')
                    )
                }>
                Copy Organizer Edit Link
              </Button>
            </Menu.Item>
            <Menu.Item>
              <Button style={{ width: '100%' }} onClick={this.duplicate}>
                Duplicate
              </Button>
            </Menu.Item>
          </Menu>
        }>
        <Button>
          More <Icon type="down" />
        </Button>
      </Dropdown>
    ]
      .concat(
        category == 'ESM Call #1'
          ? [
              <Button onClick={this.reject} type="danger">
                Reject
              </Button>,
              <Button onClick={this.markCalled} type="default">
                Mark Called
              </Button>,
              <Button onClick={this.markCalledAndConfirm} type="primary">
                Mark Called and Confirm Event
              </Button>
            ]
          : []
      )
      .concat(
        category == 'Needs Approval'
          ? [
              <Button onClick={this.reject} type="danger">
                Reject
              </Button>,
              <Button onClick={this.confirm} type="primary">
                Confirm
              </Button>
            ]
          : []
      )
      .concat(
        category == 'Needs Logistics'
          ? [
              <Button onClick={this.cancel} type="danger">
                Cancel
              </Button>,
              <Button onClick={this.markLogistics} type="primary">
                Mark Did Logistics Call
              </Button>
            ]
          : []
      )
      .concat(
        category == 'Needs Debrief'
          ? [
              <Button onClick={this.markDebriefed} type="primary">
                Mark Debriefed
              </Button>
            ]
          : []
      )
      .concat(
        category == 'Rejected'
          ? [
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
      .concat(
        category == 'Cancelled'
          ? [
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
      .concat(
        category == 'Upcoming'
          ? [
              <Button onClick={this.cancel} type="danger">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
      .concat(
        category == undefined && [
          <Button onClick={this.cancel} type="danger">
            Cancel
          </Button>
        ]
      )
  }
}
