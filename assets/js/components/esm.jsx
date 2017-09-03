import React, { Component } from 'react'
import { Card, Input, Layout, Tabs } from 'antd'
import socket from '../socket'
import EventCard from './event-card'

const { Header, Content } = Layout
const { Search } = Input
const { TabPane } = Tabs

const ESM_TAG = 'Event: Should Contact Host'

const tabSpec = [
  {
    title: 'ESM Call #1',
    fn: ev => ev.tags.includes(ESM_TAG) && ev.status == 'tentative'
  },
  {
    title: 'Needs Approval',
    fn: ev => !ev.tags.includes(ESM_TAG) && ev.status == 'tentative'
  },
  {
    title: 'Needs Logistics',
    fn: ev => true
  },
  {
    title: 'Needs Debrief',
    fn: ev => true
  },
  {
    title: 'Past',
    fn: ev => new Date(ev.end_date).getTime() < new Date().getTime()
  },
  {
    title: 'Rejected',
    fn: ev => ev.status == 'cancelled'
  }
]

export default class Esm extends Component {
  state = {
    events: {}
  }

  channel = null

  componentDidMount() {
    this.channel = socket.channel('events', {})

    this.channel
      .join()
      .receive('ok', resp => {
        console.log('Joined successfully', resp)
      })
      .receive('error', resp => {
        console.log('Unable to join', resp)
      })

    this.channel.on('event', ({ id, event }) => {
      this.state.events[id] = event
      this.forceUpdate()
    })

    this.channel.push('ready')
  }

  eventsFor(fn) {
    const { events } = this.state

    return Object.keys(events).map(id =>
      <EventCard key={id} event={events[id]} />
    )
  }

  render() {
    return (
      <Layout style={{ width: '100%', height: '100%' }}>
        <Header>
          <Search
            placeholder="Search title and description"
            style={{ width: 200 }}
            onSearch={value => console.log(value)}
          />
        </Header>
        <Content>
          <Tabs>
            {tabSpec.map(({ title, fn }) =>
              <TabPane tab={title} key={title}>
                <div style={{display: 'flex', flexWrap: 'wrap'}}>
                  {this.eventsFor(fn)}
                </div>
              </TabPane>
            )}
          </Tabs>
        </Content>
      </Layout>
    )
  }
}
