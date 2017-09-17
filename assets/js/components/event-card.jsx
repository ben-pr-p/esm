import React, { Component } from 'react'
import { Button, Card, Input, Layout, Tabs, Select } from 'antd'
import EditableText from './editable-text'
import EditableDate from './editable-date'

const { Option } = Select
const ButtonGroup = Button.Group

export default class EventCard extends Component {
  onSave = kv => this.props.channel.push(`edit-${this.props.event.id}`, kv)

  onTypeChange = val =>
    this.props.channel.push(`edit-${this.props.event.id}`, ['type', val])
  onTagsChange = vals =>
    this.props.channel.push(`tags-${this.props.event.id}`, vals)
  onCalendarChange = vals =>
    this.props.channel.push(`calendars-${this.props.event.id}`, vals)

  reject = () =>
    this.props.channel.push(`action-${this.props.event.id}`, {
      status: 'rejected'
    })

  cancel = () =>
    this.props.channel.push(`action-${this.props.event.id}`, {
      status: 'cancelled'
    })

  confirm = () =>
    this.props.channel.push(`action-${this.props.event.id}`, {
      status: 'confirmed'
    })

  makeTentative = () =>
    this.props.channel.push(`action-${this.props.event.id}`, {
      status: 'tentative'
    })

  markCalled = () =>
    this.props.channel.push(`action-${this.props.event.id}`, {
      action: 'called'
    })

  markLogistics = () =>
    this.props.channel.push(`action-${this.props.event.id}`, {
      action: 'logisticsed'
    })

  markDebriefed = () =>
    this.props.channel.push(`action-${this.props.event.id}`, {
      action: 'debriefed'
    })

  duplicate = () => this.props.channel.push(`duplicate-${this.props.event.id}`)

  render() {
    const { event, category } = this.props

    const {
      title,
      tags,
      status,
      name,
      description,
      location,
      start_date,
      end_date,
      host,
      type,
      rsvp_download_url
    } = event

    console.log(description)

    return (
      <Card
        title={<EditableText onSave={this.onSave} value={title} attr="title" />}
        style={{ width: '100%', margin: 25 }}
        bodyStyle={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
      >
        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Slug:</strong>{' '}
          <EditableText onSave={this.onSave} value={name} attr="name" />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: '100%' }}
        >
          <strong>Description:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={description}
            attr="description"
            textarea={true}
          />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: '100%' }}
        >
          <strong>Type:</strong>{' '}
          <Select
            defaultValue={type}
            style={{ width: 300 }}
            onChange={this.onTypeChange}
          >
            {[
              'Phonebank',
              'Organizing meeting',
              'Tabling or Clipboarding',
              'Canvass',
              'Rally, march, or protest',
              'Other'
            ].map(o =>
              <Option value={o}>
                {o}
              </Option>
            )}
          </Select>
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: '100%' }}
        >
          <strong>Calendars:</strong>{' '}
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Calendars"
            onChange={this.onCalendarChange}
            defaultValue={tags
              .filter(t => t.includes('Calendar:'))
              .map(t => t.split(':')[1].trim())}
          >
            {calendarOptions.map(c =>
              <Option key={c}>
                {c}
              </Option>
            )}
          </Select>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Starts at:</strong> <br />
          <EditableDate
            value={start_date}
            time_zone={location.time_zone}
            onSave={this.onSave}
            attr="start_date"
          />
          <br />
          <br />
          <strong>Ends at:</strong> <br />
          <EditableDate
            value={end_date}
            time_zone={location.time_zone}
            onSave={this.onSave}
            attr="end_date"
          />
          <br />
          <br />
          <strong>Time zone:</strong> <br />
          <EditableText
            onSave={this.onSave}
            value={location.time_zone}
            attr="location.time_zone"
          />
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Location</strong>
          <br />
          <strong>Venue:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={location.venue}
            attr="location.venue"
          />
          <br />
          <strong>Address:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={location.address_lines[0]}
            attr="location.address_lines[0]"
          />
          <br />
          <strong>City:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={location.locality}
            attr="location.locality"
          />
          <br />
          <strong>State:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={location.region}
            attr="location.region"
          />
          <br />
          <strong>Zip:</strong>{' '}
          <EditableText
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
            onSave={this.onSave}
            value={host.name}
            attr="host.name"
          />
          <br />
          <strong>Phone Number:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={host.phone_number}
            attr="host.phone_number"
          />
          <br />
          <strong>Email Address:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={host.email_address}
            attr="host.email_address"
          />
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Tags:</strong>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Tags"
            onChange={this.onTagsChange}
            defaultValue={tags.filter(
              t =>
                !t.includes('Event: Action') &&
                !t.includes('Calendar') &&
                !t.includes('Event Type:')
            )}
          >
            {window.tagOptions
              .filter(
                t => !t.includes('Event: Action') && !t.includes('Calendar')
              )
              .map(t =>
                <Option key={t}>
                  {t}
                </Option>
              )}
          </Select>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            marginLeft: 20
          }}
        >
          {category == 'ESM Call #1' && [
            <Button
              onClick={this.reject}
              style={{ marginLeft: 10 }}
              type="danger"
            >
              Reject
            </Button>,
            <Button
              onClick={this.markCalled}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Mark Called
            </Button>
          ]}

          {category == 'Needs Approval' && [
            <Button
              onClick={this.reject}
              style={{ marginLeft: 10 }}
              type="danger"
            >
              Reject
            </Button>,
            <Button
              onClick={this.confirm}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Confirm
            </Button>
          ]}

          {category == 'Needs Logistics' && [
            <Button
              onClick={this.cancel}
              style={{ marginLeft: 10 }}
              type="danger"
            >
              Cancel
            </Button>,
            <Button
              onClick={this.markLogistics}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Mark Did Logistics Call
            </Button>
          ]}

          {category == 'Needs Debrief' && [
            <Button onClick={this.duplicate} style={{ marginLeft: 10 }}>
              Duplicate
            </Button>,
            <Button
              onClick={this.markDebriefed}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Mark Debriefed
            </Button>
          ]}

          {category == 'Past' && [
            <Button
              onClick={this.duplicate}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Duplicate
            </Button>
          ]}

          {category == 'Rejected' && [
            <Button
              onClick={this.makeTentative}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Back to Tentative
            </Button>
          ]}

          {category == 'Cancelled' && [
            <Button
              onClick={this.makeTentative}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Back to Tentative
            </Button>
          ]}

          {category == 'Upcoming' && [
            <Button
              onClick={this.makeTentative}
              style={{ marginLeft: 10 }}
              type="primary"
            >
              Back to Tentative
            </Button>
          ]}

          <Button
            onClick={() => window.open(rsvp_download_url)}
            type="default"
            style={{ marginLeft: 10 }}
          >
            Download RSVPs
          </Button>
        </div>
      </Card>
    )
  }
}
