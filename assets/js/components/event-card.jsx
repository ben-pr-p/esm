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
import EditableDate from './editable-date'
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

  reject = () => this.setState({ rejecting: true })

  rejectWithMessage = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'rejected',
      message: this.state.rejectionMessage
    })

  setRejectionMessage = e => this.setState({ rejectionMessage: e.target.value })

  cancel = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'cancelled'
    })

  confirm = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'confirmed'
    })

  makeTentative = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      status: 'tentative'
    })

  markCalled = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      action: 'called'
    })

  markCalledAndConfirm = () => {
    this.markCalled()
    this.confirm()
  }

  markLogistics = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      action: 'logisticsed'
    })

  markDebriefed = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      action: 'debriefed'
    })

  duplicate = () => this.props.channel.push(`duplicate-${this.props.id}`)

  checkout = () => this.props.channel.push(`checkout-${this.props.id}`)
  checkin = () => this.props.channel.push(`checkin-${this.props.id}`)

  state = {
    rejecting: false,
    rejectionMessage: ''
  }

  componentWillReceiveProps(_nextProps) {
    this.state.saving = false
  }

  render() {
    const { event, category } = this.props

    const {
      title,
      tags,
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
                <span> {attendance_count} RSVPs </span>,
                <div style={{ marginLeft: 30 }}>{this.renderButtons()}</div>
              ]
            )}
          </div>
        }
        style={{ width: '100%', margin: 25 }}
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

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong> Date and Time </strong>
          <EditableDateRange
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            time_zone={location.time_zone}
            start_date={start_date}
            end_date={end_date}
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
        category == 'ESM Call'
          ? [
              <Button onClick={this.cancel} type="danger">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="default">
                Back to Tentative
              </Button>,
              <BUtton onClick={this.markCalled} type="primary">
                Mark Called
              </BUtton>
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
        category == 'Ready to Go'
          ? [
              <Button onClick={this.cancel} type="default">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
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
              <Button onClick={this.cancel} type="default">
                Cancel
              </Button>,
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
  }
}
