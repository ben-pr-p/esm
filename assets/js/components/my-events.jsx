import React, { Component } from 'react'
import enUS from 'antd/lib/locale-provider/en_US'
import { Layout, LocaleProvider } from 'antd'
import socket from '../socket'
import EventCard from './event-card'

const { Header, Content } = Layout

export default class MyEvents extends Component {
  state = {
    events: {},
    channel: null
  }

  componentDidMount() {
    const token = document
      .querySelector('#organizer-token')
      .getAttribute('content')

    this.state.channel = socket.channel('events', { organizer_token: token })

    this.state.channel
      .join()
      .receive('ok', resp => {
        console.log('Joined successfully', resp)
      })
      .receive('error', resp => {
        console.log('Unable to join', resp)
      })

    this.state.channel.on('event', ({ id, event }) => {
      this.state.events[id] = event
      this.forceUpdate()
    })

    this.state.channel.push('ready', { page: 'my-events' })
  }

  render() {
    return (
      <LocaleProvider locale={enUS}>
        <Layout style={{ width: '100%', height: '100%' }}>
          <Header style={{ display: 'flex', justifyContent: 'space-around' }}>
            <h1 style={{ color: 'white' }}>Edit Your Events</h1>
            <h2 style={{ color: 'white' }}>
              You can double click on any text field or date to edit it.
            </h2>
          </Header>
          <Content style={{width: '95%'}}>
            {Object.keys(this.state.events).map(id => (
              <EventCard
                key={id}
                event={this.state.events[id]}
                channel={this.state.channel}
                category={undefined}
                hostEdit={true}
              />
            ))}
          </Content>
        </Layout>
      </LocaleProvider>
    )
  }
}
