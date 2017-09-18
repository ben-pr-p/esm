import React, { Component } from 'react'
import socket from '../socket'
import { Table, LocaleProvider } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'
import moment from 'moment'
import mtz from 'moment-timezone'

export default class List extends Component {
  columns = [
    'title',
    'candidate',
    'browser_url',
    'type',
    'rsvp_download_url',
    'venue',
    'address',
    'city',
    'state',
    'zip',
    'host_name',
    'host_email',
    'host_phone',
    'rsvps',
    'start_date',
    'end_date'
  ].map(attr => ({
    title: capitalize(attr),
    key: attr,
    dataIndex: attr,
    width: 200,
    sorter: (a, b) =>
      attr.includes('date')
        ? mtz(a[attr], 'dd MM/DD, h:mm a') < mtz(b[attr], 'dd MM/DD, h:mm a')
          ? -1
          : 1
        : typeof a[attr] == 'string'
          ? a[attr] < b[attr] ? -1 : 1
          : a[attr] - b[attr],
    render: (text, record, index) => text // (
    //   // <div
    //   //   style={{
    //   //     whiteSpace: 'no-wrap',
    //   //     overflowX: 'scroll',
    //   //     width: '100%',
    //   //     height: 50,
    //   //     display: 'flex',
    //   //     alignItems: 'center'
    //   //   }}
    //   // >
    //   // </div>
    // )
  }))

  state = {
    events: []
  }

  componentDidMount() {
    const token = document
      .querySelector('#guardian_token')
      .getAttribute('content')

    this.state.channel = socket.channel('events', { guardian_token: token })

    this.state.channel
      .join()
      .receive('ok', resp => {
        console.log('Joined successfully', resp)
      })
      .receive('error', resp => {
        console.log('Unable to join', resp)
      })

    this.state.channel.on('event', data => {
      this.state.events.push(preprocess(data.event))
      this.forceUpdate()
    })

    this.state.channel.push('ready', { page: 'list' })
  }

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Table
          size="middle"
          scroll={{ x: 3500 }}
          pagination={false}
          bordered={true}
          dataSource={this.state.events}
          columns={this.columns}
        />
      </LocaleProvider>
    )
  }
}

const capitalize = str =>
  str
    .replace(/_/g, ' ')
    .split(' ')
    .map(s => s.slice(0, 1).toUpperCase() + s.slice(1))
    .join(' ')

const preprocess = ({
  name,
  title,
  browser_url,
  description,
  instructions,
  type,
  rsvp_download_url,
  location,
  contact,
  attendances,
  start_date,
  end_date,
  tags
}) => ({
  key: name,
  title,
  description,
  instructions,
  type,
  rsvp_download_url: linkify(rsvp_download_url),
  browser_url: linkify(browser_url),
  address: location.address_lines[0],
  venue: location.venue,
  host_name: contact.name,
  host_email: contact.email_address,
  host_phone: contact.phone_number,
  rsvps: attendances.length,
  city: location.locality,
  state: location.region,
  zip: location.postal_code,
  start_date: mtz(start_date)
    .tz(location.time_zone)
    .format('dd, MM/DD, h:mm a'),
  end_date: mtz(end_date)
    .tz(location.time_zone)
    .format('dd MM/DD, h:mm a'),
  candidate:
    tags
      .filter(
        t =>
          t.startsWith('Calendar: ') &&
          !t.includes('Brand New Congress') &&
          !t.includes('Justice Democrats')
      )
      .map(t => t.split(':')[1].trim())[0] || 'General'
})

const linkify = href => (
  <a target="_blank" href={href}>
    {href}
  </a>
)
