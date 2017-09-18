import React, { Component } from 'react'
import socket from '../socket'
import { Table, LocaleProvider } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'
import moment from 'moment'
import mtz from 'moment-timezone'

export default class List extends Component {
  columns = [
    'title',
    'browser_url',
    'instructions',
    'type',
    'rsvp_download_url',
    'address',
    'venue',
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
    render: (text, record, index) => <div
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
      console.log(data)
      this.state.events.push(preprocess(data.event))
      this.forceUpdate()
    })

    this.state.channel.push('ready', { page: 'list' })
  }

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Table
          size="small"
          scroll={{x: 3500}}
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
  end_date
}) => {
  return {
    title,
    browser_url,
    description,
    instructions,
    type,
    rsvp_download_url,
    address: location.address_lines[0],
    venue: location.venue,
    host_name: contact.name,
    host_email: contact.email,
    host_phone: contact.phone,
    rsvps: attendances.length,
    start_date: mtz(start_date)
      .tz(location.time_zone)
      .format('dddd, MMMM Do YYYY, h:mm a'),
    end_date: mtz(end_date)
      .tz(location.time_zone)
      .format('dddd, MMMM Do YYYY, h:mm a')
  }
}
