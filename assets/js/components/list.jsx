import React, { Component } from 'react'
import socket from '../socket'
import { Table, LocaleProvider } from 'antd'
import enUS from 'antd/lib/locale-provider/en_US'

export default class List extends Component {
  columns = [
    'title',
    'tags',
    'status',
    'name',
    'description',
    'summary',
    'instructions',
    'location',
    'start_date',
    'end_date',
    'contact',
    'type',
    'rsvp_download_url',
    'attendances',
    'browser_url'
  ].map(attr => ({
    title: capitalize(attr),
    key: attr,
    dataIndex: attr
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

    this.state.channel.on('event', ({ id, event }) => {
      this.state.events.push(event)
      this.forceUpdate()
    })

    this.state.channel.push('ready', { page: 'list' })
  }

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Table dataSource={this.state.events} columns={this.columns} />
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
