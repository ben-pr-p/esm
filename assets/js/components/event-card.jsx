import React, { Component } from 'react'
import {
  Button,
  Card,
  Dropdown,
  Icon,
  Input,
  Layout,
  Menu,
  Tabs,
  Select,
  message
} from 'antd'
import EditableText from './editable-text'
import EditableDate from './editable-date'
import clipboard from 'clipboard-js'
import mtz from 'moment-timezone'

const { Option } = Select

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
      summary,
      instructions,
      location,
      start_date,
      end_date,
      contact,
      type,
      rsvp_download_url,
      attendances,
      browser_url
    } = event

    return (
      <Card
        title={<EditableText onSave={this.onSave} value={title} attr="title" />}
        extra={
          <div style={{ display: 'flex' }}>
            {attendances.length} RSVPs
            <div style={{ marginLeft: 30 }}>{this.renderButtons()}</div>
          </div>
        }
        style={{ width: '100%', margin: 25 }}
        bodyStyle={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}
      >
        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Slug:</strong>{' '}
          <EditableText onSave={this.onSave} value={name} attr="name" />
        </div>

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
          style={{ margin: 10, minWidth: 250, width: '100%' }}
        >
          <strong>Summary:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={summary}
            attr="summary"
            textarea={true}
          />
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
          <strong>Instructions:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={instructions}
            attr="instructions"
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
            ].map(o => <Option value={o}>{o}</Option>)}
          </Select>
        </div>

        {!this.props.hostEdit && (
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
              {calendarOptions.map(c => <Option key={c}>{c}</Option>)}
            </Select>
          </div>
        )}

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
          <Select
            style={{width: 150}}
            value={location.time_zone}
            onChange={tz => this.onSave(['location.time_zone', tz])}
            attr="location.time_zone"
          >
            {[
              'America/New_York',
              'America/Chicago',
              'America/Salt_Lake_City',
              'America/Phoenix',
              'America/Los_Angeles',
              'America/Anchorage',
              'America/Adak',
              'America/Honolulu'
            ].map(o => <Option value={o}>{o}</Option>)}
          </Select>
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
            value={contact.name}
            attr="contact.name"
          />
          <br />
          <strong>Phone Number:</strong>{' '}
          <EditableText
            onSave={this.onSave}
            value={contact.phone_number}
            attr="contact.phone_number"
          />
          <br />
          <strong>Email Address:</strong>{' '}
          <EditableText
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
                onClick={() => window.open(rsvp_download_url)}
              >
                Download RSVPs
              </Button>
            </Menu.Item>
            <Menu.Item>
              <Button
                style={{ width: '100%' }}
                onClick={() =>
                  clipboard
                    .copy(
                      `https://admin.justicedemocrats.com${rsvp_download_url}`
                    )
                    .then(() =>
                      message.success('RSVP download link copied to clipboard')
                    )}
              >
                Copy RSVP Download Link
              </Button>
            </Menu.Item>
            <Menu.Item>
              <Button
                style={{ width: '100%' }}
                onClick={() =>
                  clipboard
                    .copy(
                      `https://admin.justicedemocrats.com${organizer_edit_url}`
                    )
                    .then(() =>
                      message.success('Organizer edit link copied to clipboard')
                    )}
              >
                Copy Organizer Edit Link
              </Button>
            </Menu.Item>
            <Menu.Item>
              <Button style={{ width: '100%' }} onClick={this.duplicate}>
                Duplicate
              </Button>
            </Menu.Item>
          </Menu>
        }
      >
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
              <Button onClick={this.markCalled} type="primary">
                Mark Called
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
              <Button onClick={this.makeTentative} type="primary">
                Back to Tentative
              </Button>
            ]
          : []
      )
  }
}
